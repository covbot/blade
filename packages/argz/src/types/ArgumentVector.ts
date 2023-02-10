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
	isDirty,
} from 'zod';
import { Argument, ArgumentAny } from './Argument.internal';
import { ArgumentApi, ArgumentType, CastableArgumentApi, KeyValuePair } from './ArgumentApi';

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

		if (argumentApi.grouped) {
			const fullPath: string[] = [];
			let segment: string | undefined;
			let currentApi: ArgumentApi | undefined;

			if (argumentApi.named) {
				const rootNames = argumentApi.named.getNames(undefined, getArgumentName);
				if (rootNames.length === 0) {
					currentApi = argumentApi;
				} else if (segments[0] && rootNames.includes(segments[0])) {
					currentApi = argumentApi;
					segments.shift();
				}
			} else {
				currentApi = argumentApi;
			}

			while ((segment = segments.shift()) !== undefined) {
				if (currentApi === undefined) {
					return undefined;
				}

				if (currentApi.grouped) {
					const value: KeyValuePair<ArgumentAny> | undefined = currentApi.grouped.getChildArgument(
						segment,
						getArgumentName,
					);

					if (value === undefined) {
						return undefined;
					}

					fullPath.push(value.key);
					currentApi = value.value._getApi();
				} else {
					return undefined;
				}
			}

			if (currentApi?.castable === undefined) {
				return undefined;
			}

			return [fullPath, currentApi.castable];
		}

		if (argumentApi.named) {
			if (segments.length !== 1) {
				return undefined;
			}

			const names = argumentApi.named.getNames(undefined, getArgumentName);

			if (names.includes(argumentName) && argumentApi.castable) {
				return [[], argumentApi.castable];
			}

			return undefined;
		}

		throw new Error('Unknown schema type provided');
	}

	private _findAllArgumentPaths(filter: (value: ArgumentApi) => boolean): string[][] {
		const output: string[][] = [];
		const queue: Array<KeyValuePair<Argument, string[]>> = [{ key: [], value: this._def.configSchema }];

		let currentItem: KeyValuePair<Argument, string[]> | undefined;
		while ((currentItem = queue.shift()) !== undefined) {
			const { key: currentPath, value: currentSchema } = currentItem;

			const api = currentSchema._getApi();

			if (api.grouped) {
				const childItems = api.grouped.getIterableChildArguments();
				queue.push(
					...childItems.map(({ key, value }) => ({
						key: [...currentPath, key],
						value,
					})),
				);
			}

			if (filter(api)) {
				output.push(currentPath);
			}
		}

		return output;
	}

	private _getPositionalArgumentPaths(): string[][] {
		return this._findAllArgumentPaths((item) => item.type === ArgumentType.POSITIONAL);
	}

	private _getBypassedArgumentPaths(): string[][] {
		return this._findAllArgumentPaths((item) => item.type === ArgumentType.BYPASSED);
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

			const parseResult = this._def.configSchema._schema._parse({
				data: syncResult.value,
				path: [],
				parent: this._getOrReturnCtx(input),
			});

			return synchronize(parseResult, (syncParseResult) => {
				if (isAborted(syncParseResult)) {
					return INVALID;
				}

				if (isDirty(syncResult)) {
					return {
						status: 'dirty',
						value: syncParseResult.value,
					};
				}

				return syncParseResult;
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

		const positionalPaths = this._getPositionalArgumentPaths();
		for (const key of positionalPaths) {
			pairs.push({ key, value: positional });
		}
		const bypassedPaths = this._getBypassedArgumentPaths();
		for (const key of bypassedPaths) {
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
