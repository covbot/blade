import assert from 'node:assert';
import { ZodUnion, RawCreateParams } from 'zod';
import { Argument, ArgumentAny } from './Argument.internal';
import {
	ArgumentType,
	NamedArgumentApi,
	GroupedArgumentApi,
	KeyValuePair,
	ArgumentApi,
	BypassedArgumentApi,
	PositionalArgumentApi,
} from './ArgumentApi';
import { GroupedArgument } from './GroupedArgument';
import { NamedArgumentDefinition } from './NamedArgument';
import { CastError } from '../CastError';
import { convertUtils } from '../convertUtils';

export type UnionArgumentOptions = readonly [ArgumentAny, ...ArgumentAny[]];

export type UnionArgumentDefinition<T extends UnionArgumentOptions> = {
	options: T;
} & NamedArgumentDefinition;

const nonCastableTypes = new Set([ArgumentType.BYPASSED, ArgumentType.POSITIONAL]);

export class UnionArgument<TOptions extends UnionArgumentOptions> extends GroupedArgument<
	ZodUnion<convertUtils.ConvertUnion<TOptions>>,
	UnionArgumentDefinition<TOptions>
> {
	private static getUnionError(firstType: ArgumentType, secondType: ArgumentType) {
		return (
			`Cannot create union - ${firstType} argument is not assignable to ${secondType}. ` +
			`Arguments must be either all castable types (${ArgumentType.GROUP}, ${ArgumentType.NAMED}), or ` +
			`have the same type (all ${ArgumentType.BYPASSED} or all ${ArgumentType.POSITIONAL})`
		);
	}

	public constructor(
		schema: ZodUnion<convertUtils.ConvertUnion<TOptions>>,
		definition: UnionArgumentDefinition<TOptions>,
	) {
		super(schema, definition);

		let type: ArgumentType | undefined = undefined;
		for (const option of definition.options) {
			const optionType = option._getApi().type;

			if (type === undefined) {
				type = optionType;
			} else {
				if ((nonCastableTypes.has(type) || nonCastableTypes.has(optionType)) && type !== optionType) {
					throw new Error(UnionArgument.getUnionError(type, optionType));
				}
			}
		}
	}

	private static assertAllNamed = (options: UnionArgumentOptions): (NamedArgumentApi | GroupedArgumentApi)[] => {
		const optionApis = options.map((option) => option._getApi());

		const correctTypes = new Set([ArgumentType.GROUP, ArgumentType.NAMED]);
		assert(
			optionApis.every((value): value is NamedArgumentApi | GroupedArgumentApi => correctTypes.has(value.type)),
			'[argz fatal]: Malformed union. Most likely, this is issue with argz.',
		);

		return optionApis;
	};

	protected override _getNames = (
		parentKey: string | undefined,
		getArgumentName: (key: string) => string,
	): string[] => {
		const optionApis = UnionArgument.assertAllNamed(this._definition.options);

		const allNames = optionApis.flatMap((api) => api.getNames(parentKey, getArgumentName));
		const dedupedNames = [...new Set(allNames)];
		return dedupedNames;
	};

	protected override _cast = (value: string | undefined): unknown => {
		const optionApis = UnionArgument.assertAllNamed(this._definition.options);

		for (const api of optionApis) {
			const castResult = api.tryCast(value);
			if (castResult.success) {
				return castResult.value;
			}
		}

		throw new CastError('Failed to cast union - none of options match.');
	};

	protected override _getIterableChildArguments = () => {
		const optionApis = UnionArgument.assertAllNamed(this._definition.options);

		return optionApis.flatMap((value) => {
			if (value.type === ArgumentType.NAMED) {
				return [];
			}

			return value.getIterableChildArguments();
		});
	};

	protected override _getChildArgument = (
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<Argument> | undefined => {
		const optionApis = UnionArgument.assertAllNamed(this._definition.options);

		for (const api of optionApis) {
			if (api.type === ArgumentType.GROUP) {
				const childOption = api.getChildArgument(childName, getArgumentName);
				if (childOption !== undefined) {
					return childOption;
				}
			}
		}

		return undefined;
	};

	public override _getApi = (): ArgumentApi => {
		const api = this._definition.options[0]._getApi();
		if (nonCastableTypes.has(api.type)) {
			return {
				type: api.type,
				getSchema: this._getSchema,
			} as BypassedArgumentApi | PositionalArgumentApi;
		}

		const optionApis = UnionArgument.assertAllNamed(this._definition.options);

		const groupType = optionApis.find((option) => option.type === ArgumentType.GROUP)?.type ?? ArgumentType.NAMED;

		if (groupType === ArgumentType.NAMED) {
			return {
				type: groupType,
				getSchema: this._getSchema,
				getNames: this._getNames,
				cast: this._cast,
				tryCast: this._tryCast,
			};
		}

		return {
			type: groupType,
			getSchema: this._getSchema,
			getNames: this._getNames,
			cast: this._cast,
			tryCast: this._tryCast,
			getIterableChildArguments: this._getIterableChildArguments,
			getChildArgument: this._getChildArgument,
		};
	};

	static create = <TOptions extends Readonly<[ArgumentAny, ArgumentAny, ...ArgumentAny[]]>>(
		options: TOptions,
		params?: RawCreateParams & { name?: string },
	): UnionArgument<TOptions> => {
		return new UnionArgument(ZodUnion.create(convertUtils.convertUnion(options), params), {
			defaultName: params?.name,
			aliases: [],
			options,
		});
	};
}
