import { ZodTypeAny } from 'zod';
import { Argument } from './Argument';
import { CastableArgument } from './CastableArgument';
import { NamedArgument, NamedArgumentDefinition } from './NamedArgument';

export type ArgumentGroupDefinition = NamedArgumentDefinition;

export type KeyValuePair<TValue, TKey = string> = {
	key: TKey;
	value: TValue;
};

export abstract class ArgumentGroup<
	TSchema extends ZodTypeAny = ZodTypeAny,
	TDefinition extends ArgumentGroupDefinition = ArgumentGroupDefinition,
> extends NamedArgument<TSchema, TDefinition> {
	public abstract _getChildArgument(
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<CastableArgument> | undefined;

	public abstract _getIterableChildArguments(): Array<KeyValuePair<Argument>>;
}
