import { ZodTypeAny } from 'zod';
import { Argument } from './Argument';
import { ArgumentApi, ArgumentType, KeyValuePair } from './ArgumentApi';
import { NamedArgument, NamedArgumentDefinition } from './NamedArgument';

export type ArgumentGroupDefinition = NamedArgumentDefinition;

export abstract class GroupedArgument<
	TSchema extends ZodTypeAny = ZodTypeAny,
	TDefinition extends ArgumentGroupDefinition = ArgumentGroupDefinition,
> extends NamedArgument<TSchema, TDefinition> {
	protected abstract _getChildArgument(
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<Argument> | undefined;

	protected abstract _getIterableChildArguments(): Array<KeyValuePair<Argument>>;

	public override _getApi = (): ArgumentApi => {
		return {
			type: ArgumentType.GROUP,
			cast: this._cast,
			tryCast: this._tryCast,
			getChildArgument: this._getChildArgument,
			getIterableChildArguments: this._getIterableChildArguments,
			getNames: this._getNames,
			getSchema: this._getSchema,
		};
	};
}
