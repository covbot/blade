import assert from 'node:assert';
import { ZodUnion, RawCreateParams } from 'zod';
import { Argument, ArgumentAny } from './Argument.internal';
import { ArgumentType, KeyValuePair, ArgumentApi } from './ArgumentApi';
import { GroupedArgument } from './GroupedArgument';
import { NamedArgumentDefinition } from './NamedArgument';
import { argumentUtils } from '../argumentUtils';
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
		this._getApi = this._getApi.bind(this);

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

	private static assertAllOptions = (
		options: UnionArgumentOptions,
	): argumentUtils.AssertedArgumentFeatures<'named' | 'castable'>[] => {
		const optionApis: ArgumentApi[] = options.map((option) => option._getApi());

		assert(
			optionApis.every((api): api is argumentUtils.AssertedArgumentFeatures<'named' | 'castable'> =>
				argumentUtils.checkApiFeatures(api, ['named', 'castable']),
			),
			'[argz internal]: Malformed UnionArgument. Most likely, that is an issue with argz.',
		);

		return optionApis;
	};

	protected override _getNames = (
		parentKey: string | undefined,
		getArgumentName: (key: string) => string,
	): string[] => {
		const optionApis = UnionArgument.assertAllOptions(this._definition.options);

		const allNames = optionApis.flatMap((api) => api.named.getNames(parentKey, getArgumentName));
		return [...new Set(allNames)];
	};

	protected override _cast = (value: string | undefined): unknown => {
		const optionApis = UnionArgument.assertAllOptions(this._definition.options);

		for (const api of optionApis) {
			const castResult = api.castable.tryCast(value);
			if (castResult.success) {
				return castResult.value;
			}
		}

		throw new CastError('Failed to cast union - none of options match.');
	};

	protected override _getIterableChildArguments = () => {
		const optionApis = UnionArgument.assertAllOptions(this._definition.options);

		return optionApis.flatMap((value) => {
			if (!value.grouped) {
				return [];
			}

			return value.grouped.getIterableChildArguments();
		});
	};

	protected override _getChildArgument = (
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<Argument> | undefined => {
		console.log(childName);
		const optionApis = UnionArgument.assertAllOptions(this._definition.options);

		for (const api of optionApis) {
			if (api.grouped) {
				const childOption = api.grouped.getChildArgument(childName, getArgumentName);
				console.log(childOption);
				if (childOption !== undefined) {
					return childOption;
				}
			}
		}

		return undefined;
	};

	public override _getApi(): ArgumentApi {
		const api = this._definition.options[0]._getApi();

		const apiBase: ArgumentApi = {
			type: api.type,
			common: {
				getSchema: this._getSchema,
			},
		};

		if (nonCastableTypes.has(api.type)) {
			return apiBase;
		}

		apiBase.castable = {
			cast: this._cast,
			tryCast: this._tryCast,
		};
		apiBase.named = {
			getNames: this._getNames,
		};

		const optionApis = UnionArgument.assertAllOptions(this._definition.options);
		const groupType = optionApis.find((option) => option.type === ArgumentType.GROUP)?.type ?? ArgumentType.NAMED;

		if (groupType === ArgumentType.NAMED) {
			return {
				...apiBase,
				type: groupType,
			};
		}

		return {
			...apiBase,
			type: groupType,
			grouped: {
				getIterableChildArguments: this._getIterableChildArguments,
				getChildArgument: this._getChildArgument,
			},
		};
	}

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
