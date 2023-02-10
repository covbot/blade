import { ZodTypeAny } from 'zod';
import { Argument } from './Argument.internal';
import { ArgumentApi, ArgumentType, KeyValuePair } from './ArgumentApi';
import { NamedArgument, NamedArgumentDefinition } from './NamedArgument';

export type ArgumentGroupDefinition = NamedArgumentDefinition;

export abstract class GroupedArgument<
	TSchema extends ZodTypeAny = ZodTypeAny,
	TDefinition extends ArgumentGroupDefinition = ArgumentGroupDefinition,
> extends NamedArgument<TSchema, TDefinition> {
	public constructor(schema: TSchema, definition: TDefinition) {
		super(schema, definition);
		this._getApi = this._getApi.bind(this);
	}

	protected abstract _getChildArgument(
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<Argument> | undefined;

	protected abstract _getIterableChildArguments(): Array<KeyValuePair<Argument>>;

	public override _getApi(): ArgumentApi {
		const parentApi = super._getApi();

		return {
			...parentApi,
			type: ArgumentType.GROUP,
			grouped: {
				getChildArgument: this._getChildArgument,
				getIterableChildArguments: this._getIterableChildArguments,
			},
		};
	}
}
