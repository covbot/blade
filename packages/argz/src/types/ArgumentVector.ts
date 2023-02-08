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
import { Argument } from './Argument';
import { ArgumentGroup, KeyValuePair } from './ArgumentGroup';
import { BypassedArgument } from './BypassedArgument';
import { CastableArgument } from './CastableArgument';
import { NamedArgument } from './NamedArgument';
import { PositionalArgument } from './PositionalArgument';

export type ArgumentVectorDefinition<TArgument extends Argument> = {
	configSchema: TArgument;
	getArgumentName?: (key: string) => string;
} & ZodTypeDef;

const argumentsSchema = zodArraySchema(zodStringSchema());

const longArgumentExpressionRe = /^--(?<name>[^\s=]+)=(?<value>.+)$/;
const longArgumentNameRe = /^--(?<name>[^\s=]+)$/;
const shortArgumentRe = /^-(?<flags>[^\s=]+)$/;

export class ArgumentVector<TArgument extends Argument, TOutput = TypeOf<TArgument['_schema']>> extends ZodType<
	TOutput,
	ArgumentVectorDefinition<TArgument>,
	string[]
> {
	private _getOption(argumentName: string): [path: string[], arg: CastableArgument] | undefined {
		const schema = this._def.configSchema;

		const getArgumentName = this._def.getArgumentName ?? kebabCase;
		const segments = argumentName.split('.');

		if (schema instanceof ArgumentGroup) {
			const fullPath: string[] = [];
			let segment: string | undefined;
			let currentSchema: CastableArgument | undefined = schema;
			while ((segment = segments.shift()) !== undefined) {
				if (currentSchema === undefined) {
					return undefined;
				}

				if (currentSchema instanceof ArgumentGroup) {
					const value = currentSchema._getChildArgument(segment, getArgumentName);
					if (value === undefined) {
						return undefined;
					}
					fullPath.push(value.key);
					currentSchema = value.value;
				} else {
					return undefined;
				}
			}

			return [fullPath, currentSchema];
		}

		if (schema instanceof NamedArgument) {
			if (segments.length !== 1) {
				return undefined;
			}

			const names = schema._getNames(undefined, getArgumentName);

			if (names.includes(argumentName)) {
				return [[], schema];
			}

			return undefined;
		}

		throw new Error('Unknown schema type provided');
	}

	private _filterArguments<T extends Argument>(
		filter: (value: Argument) => value is T,
	): Array<KeyValuePair<T, string[]>> {
		const output: Array<KeyValuePair<T, string[]>> = [];
		const queue: Array<KeyValuePair<Argument, string[]>> = [{ key: [], value: this._def.configSchema }];

		let currentItem: KeyValuePair<Argument, string[]> | undefined;
		while ((currentItem = queue.shift()) !== undefined) {
			const { key: currentPath, value: currentSchema } = currentItem;

			if (filter(currentSchema)) {
				output.push({ key: currentPath, value: currentSchema });
			}

			if (currentSchema instanceof ArgumentGroup) {
				const childItems = currentSchema._getIterableChildArguments();
				queue.push(
					...childItems.map(({ key, value }) => ({
						key: [...currentPath, key],
						value,
					})),
				);
			}
		}

		return output;
	}

	private _getPositionalArguments(): Array<KeyValuePair<PositionalArgument, string[]>> {
		return this._filterArguments((item): item is PositionalArgument => item instanceof PositionalArgument);
	}

	private _getBypassedArguments(): Array<KeyValuePair<BypassedArgument, string[]>> {
		return this._filterArguments((item): item is BypassedArgument => item instanceof BypassedArgument);
	}

	/**
	 * The purpose of ArgzArguments class is to process string array from "process.argv".
	 * This method extracts key-value pairs from this array, and passes it into given schemas.
	 */
	public _parse(input: ParseInput): ParseReturnType<TOutput> {
		const castResult = this._cast(input);

		if (isAborted(castResult)) {
			return INVALID;
		}

		return this._def.configSchema._schema._parse({
			data: castResult.value,
			path: [],
			parent: this._getOrReturnCtx(input),
		});
	}

	public _cast(input: ParseInput): SyncParseReturnType<TOutput> {
		const result = argumentsSchema._parseSync(input);

		if (isAborted(result)) {
			return result;
		}

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
							const output = option._tryCast(nextItem);

							success = output.success;
							if (output.success) {
								castedValue = output.value;
								++index;
							}
						}

						success = true;
					} else {
						const output = option._tryCast(value);

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
		const constructedObjectWrapper = { value: {} };
		for (const { key, value } of pairs) {
			set(constructedObjectWrapper, ['value', ...key], value);
		}

		return { status: status.value, value: constructedObjectWrapper.value } as OK<TOutput> | DIRTY<TOutput>;
	}

	static create = <T extends Argument>(schema: T): ArgumentVector<T> => {
		return new ArgumentVector({ configSchema: schema });
	};
}
