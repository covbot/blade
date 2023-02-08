import { ZodTypeAny } from 'zod';
import { CastableArgument } from './CastableArgument';

export type NamedArgumentDefinition = {
	defaultName?: string;
	aliases: string[];
};

export abstract class NamedArgument<
	TSchema extends ZodTypeAny = ZodTypeAny,
	TDefinition extends NamedArgumentDefinition = NamedArgumentDefinition,
> extends CastableArgument<TSchema, TDefinition> {
	public _getNames(parentKey: string | undefined, getArgumentName: (key: string) => string): string[] {
		let defaultName = this._definition.defaultName;

		if (parentKey) {
			defaultName ??= getArgumentName(parentKey);
		}

		const names = [...this._definition.aliases];
		if (defaultName) {
			names.unshift(defaultName);
		}

		return names;
	}

	public alias(alias: string): this {
		return this._clone(undefined, { ...this._definition, aliases: [...this._definition.aliases, alias] });
	}
}
