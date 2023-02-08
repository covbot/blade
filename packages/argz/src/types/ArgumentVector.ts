import assert from 'node:assert';
import kebabCase from 'kebab-case';
import set from 'lodash.set';
import {
	ZodType,
	TypeOf,
	ZodTypeDef,
	ParseInput,
	ParseReturnType,
	isAborted,
	INVALID,
	array as zodArraySchema,
	string as zodStringSchema,
	addIssueToContext,
	ZodIssueCode,
	OK,
	DIRTY,
	SyncParseReturnType,
} from 'zod';
import { Argument, ArgumentAny } from './Argument.internal';
import {
	ArgumentApi,
	ArgumentType,
	BypassedArgumentApi,
	CastableArgumentApi,
	isCastableApi,
	KeyValuePair,
	PositionalArgumentApi,
} from './ArgumentApi';

export type ArgumentVectorDefinition<TArgument extends Argument> = {
	configSchema: TArgument;
	getArgumentName?: (key: string) => string;
} & ZodTypeDef;

const argumentsSchema = zodArraySchema(zodStringSchema());

const longArgumentExpressionRe = /^--(?<name>[^\s=]+)=(?<value>.+)$/;
const longArgumentNameRe = /^--(?<name>[^\s=]+)$/;
const shortArgumentRe = /^-(?<flags>[^\s=]+)$/;

const synchronize = <TInput, TOutput>(
	out: ParseReturnType<TInput>,
	handler: (out: SyncParseReturnType<TInput>) => ParseReturnType<TOutput>,
): ParseReturnType<TOutput> => {
	if (out instanceof Promise) {
		return out.then((syncOut) => handler(syncOut));
	}

	return handler(out);
};

export class ArgumentVector<TArgument extends Argument, TOutput = TypeOf<TArgument['_schema']>> extends ZodType<
	TOutput,
	ArgumentVectorDefinition<TArgument>,
	string[]
> {
	private _getOption(argumentName: string): [path: string[], arg: CastableArgumentApi] | undefined {
		const argumentApi = this._def.configSchema._getApi();

		const getArgumentName = this._def.getArgumentName ?? kebabCase;
		const segments = argumentName.split('.');

		if (argumentApi.type === ArgumentType.GROUP) {
			const fullPath: string[] = [];
			let segment: string | undefined;
			let currentSchema: Argument | undefined = this._def.configSchema;
			while ((segment = segments.shift()) !== undefined) {
				if (currentSchema === undefined) {
					return undefined;
				}

				const api: ArgumentApi = currentSchema._getApi();

				if (api.type === ArgumentType.GROUP) {
					const value: KeyValuePair<ArgumentAny> | undefined = api.getChildArgument(segment, getArgumentName);
					if (value === undefined) {
						return undefined;
					}
					fullPath.push(value.key);
					currentSchema = value.value;
				} else {
					return undefined;
				}
			}

			const currentSchemaApi = currentSchema._getApi();
			if (!isCastableApi(currentSchemaApi)) {
				return undefined;
			}

			return [fullPath, currentSchemaApi];
		}

		if (argumentApi.type === ArgumentType.NAMED) {
			if (segments.length !== 1) {
				return undefined;
			}

			const names = argumentApi.getNames(undefined, getArgumentName);

			if (names.includes(argumentName)) {
				return [[], argumentApi];
			}

			return undefined;
		}

		throw new Error('Unknown schema type provided');
	}

	private _filterArguments<T extends ArgumentApi>(
		filter: (value: ArgumentApi) => value is T,
	): Array<KeyValuePair<T, string[]>> {
		const output: Array<KeyValuePair<T, string[]>> = [];
		const queue: Array<KeyValuePair<Argument, string[]>> = [{ key: [], value: this._def.configSchema }];

		let currentItem: KeyValuePair<Argument, string[]> | undefined;
		while ((currentItem = queue.shift()) !== undefined) {
			const { key: currentPath, value: currentSchema } = currentItem;

			const api = currentSchema._getApi();

			if (api.type === ArgumentType.GROUP) {
				const childItems = api.getIterableChildArguments();
				queue.push(
					...childItems.map(({ key, value }) => ({
						key: [...currentPath, key],
						value,
					})),
				);
			}

			if (filter(api)) {
				output.push({ key: currentPath, value: api });
			}
		}

		return output;
	}

	private _getPositionalArguments(): Array<KeyValuePair<PositionalArgumentApi, string[]>> {
		return this._filterArguments((item): item is PositionalArgumentApi => item.type === ArgumentType.POSITIONAL);
	}

	private _getBypassedArguments(): Array<KeyValuePair<BypassedArgumentApi, string[]>> {
		return this._filterArguments((item): item is BypassedArgumentApi => item.type === ArgumentType.BYPASSED);
	}

	/**
	 * The purpose of ArgzArguments class is to process string array from "process.argv".
	 * This method extracts key-value pairs from this array, and passes it into given schemas.
	 */
	public _parse = (input: ParseInput): ParseReturnType<TOutput> => {
		const castResult = this._cast(input);

		return synchronize(castResult, (syncResult) => {
			if (isAborted(syncResult)) {
				return INVALID;
			}

			return this._def.configSchema._schema._parse({
				data: syncResult.value,
				path: [],
				parent: this._getOrReturnCtx(input),
			});
		});
	};

	public _cast = (input: ParseInput): ParseReturnType<TOutput> => {
		const result = argumentsSchema._parse(input);

		return synchronize(result, (syncResult) => {
			if (isAborted(syncResult)) {
				return syncResult;
			}

			return this._doCast(input, syncResult);
		});
	};

	private _doCast = (input: ParseInput, result: OK<string[]> | DIRTY<string[]>): ParseReturnType<TOutput> => {
		const { status, ctx } = this._processInputParams(input);
		const argv = result.value;

		const positional: string[] = [];
		let bypassed: string[] = [];

		const pairs: Array<KeyValuePair<unknown, string[]>> = [];

		for (let index = 0; index < argv.length; ++index) {
			const argument = argv[index]!;

			if (argument === '--') {
				// Bypassed arguments
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				bypassed = argv.slice(index + 1);
				break;
			}

			type QueueItem = {
				name: string;
				value?: string;
				needsValue: boolean;
			};

			const queue: QueueItem[] = [];

			let result: RegExpExecArray | null = null;

			if ((result = longArgumentExpressionRe.exec(argument)) !== null) {
				/**
				 * Checking if current argument is a long argument _expression_.
				 * Long argument expression has format "--name=value"
				 */

				assert(
					result.groups?.['name'] && result.groups?.['value'],
					'[argz internal]: Malformed regular expression',
				);

				const { name, value } = result.groups;

				queue.push({
					name,
					value,
					needsValue: false,
				});
			} else if ((result = longArgumentNameRe.exec(argument)) !== null) {
				/**
				 * Checking if current argument is a long argument _name_.
				 * Long argument name has format "--name"
				 */

				assert(result.groups?.['name'], '[argz internal]: Malformed regular expression');
				const { name } = result.groups;

				queue.push({
					name,
					needsValue: true,
				});
			} else if ((result = shortArgumentRe.exec(argument)) !== null) {
				/**
				 * Checking short arguments, included short argument groups.
				 * Short arguments have format: "-g", grouped: "-grp".
				 */

				assert(result.groups?.['flags'], '[argz internal]: Malformed regular expression');

				const { flags } = result.groups;

				for (let flagIndex = 0; flagIndex < flags.length - 1; ++flagIndex) {
					const flag = flags[flagIndex]!;
					queue.push({
						name: flag,
						needsValue: false,
					});
				}

				const lastFlag = flags.at(-1);
				queue.push({
					name: lastFlag!,
					needsValue: true,
				});
			} else if (argument.startsWith('-')) {
				/**
				 * Invalid argument format. Report an issue and continue parsing.
				 */
				addIssueToContext(ctx, {
					code: ZodIssueCode.custom,
					path: [index],
					message: 'Invalid argument format',
				});
				status.dirty();
			} else {
				/**
				 * If argument did not match any of previous groups, it is positional.
				 * All positional arguments are checked below, outside main loop.
				 */
				positional.push(argument);
			}

			/**
			 * Parse all queued items
			 */
			for (const { name, value, needsValue } of queue) {
				const [path, option] = this._getOption(name) ?? [];

				if (!option) {
					addIssueToContext(ctx, {
						code: ZodIssueCode.custom,
						path: [index],
						message: 'Unknown argument',
					});
					status.dirty();
				} else {
					let castedValue: unknown = undefined;
					let success = false;

					if (needsValue) {
						const nextItem = argv[index + 1];

						if (nextItem !== undefined && !nextItem.startsWith('-')) {
							const output = option.tryCast(nextItem);

							success = output.success;
							if (output.success) {
								castedValue = output.value;
								++index;
							}
						}

						success = true;
					} else {
						const output = option.tryCast(value);

						success = output.success;
						if (output.success) {
							castedValue = output.value;
						} else {
							// TODO: add detailed error here
							addIssueToContext(ctx, {
								code: ZodIssueCode.custom,
								path: [index],
								message: 'Incorrect value passed.',
							});
							status.dirty();
						}
					}

					if (success) {
						pairs.push({ key: path!, value: castedValue });
					}
				}
			}
		}

		if (status.value === 'aborted') {
			return INVALID;
		}

		const positionalOptions = this._getPositionalArguments();
		for (const { key } of positionalOptions) {
			pairs.push({ key, value: positional });
		}
		const bypassedOptions = this._getBypassedArguments();
		for (const { key } of bypassedOptions) {
			pairs.push({ key, value: bypassed });
		}

		pairs.sort((a, b) => a.key.length - b.key.length);
		const constructedObjectWrapper = { value: undefined };
		for (const { key, value } of pairs) {
			set(constructedObjectWrapper, ['value', ...key], value);
		}

		return { status: status.value, value: constructedObjectWrapper.value } as OK<TOutput> | DIRTY<TOutput>;
	};

	static create = <T extends ArgumentAny>(schema: T): ArgumentVector<T> => {
		return new ArgumentVector({ configSchema: schema });
	};
}
