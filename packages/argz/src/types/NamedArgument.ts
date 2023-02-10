import { ZodTypeAny } from 'zod';
import { ArgumentApi, ArgumentType } from './ArgumentApi';
import { CastableArgument } from './CastableArgument';

export type NamedArgumentDefinition = {
	defaultName?: string;
	aliases: string[];
};

export abstract class NamedArgument<
	TSchema extends ZodTypeAny = ZodTypeAny,
	TDefinition extends NamedArgumentDefinition = NamedArgumentDefinition,
> extends CastableArgument<TSchema, TDefinition> {
	public constructor(schema: TSchema, definition: TDefinition) {
		super(schema, definition);
		this._getApi = this._getApi.bind(this);
	}

	protected _getNames = (parentKey: string | undefined, getArgumentName: (key: string) => string): string[] => {
		let defaultName = this._definition.defaultName;

		if (parentKey) {
			defaultName ??= getArgumentName(parentKey);
		}

		const names = [...this._definition.aliases];
		if (defaultName) {
			names.unshift(defaultName);
		}

		return names;
	};

	public override _getApi(): ArgumentApi {
		const parentApi = super._getApi();

		return {
			...parentApi,
			type: ArgumentType.NAMED,
			named: {
				getNames: this._getNames,
			},
		};
	}

	public alias = (alias: string): this => {
		return this._clone(undefined, { ...this._definition, aliases: [...this._definition.aliases, alias] });
	};
}
