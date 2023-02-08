import { output, input, ZodEffects, ZodFirstPartyTypeKind } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class EffectsArgument<
	TArgument extends ArgumentAny,
	TOutput = output<TArgument['_schema']>,
	TInput = input<TArgument['_schema']>,
> extends WrappedArgument<TArgument, ZodEffects<TArgument['_schema'], TOutput, TInput>> {
	public innerType = this._unwrap;

	sourceType(): TArgument {
		return this._definition.inner._schema.typeName === ZodFirstPartyTypeKind.ZodEffects
			? (this._definition.inner as unknown as EffectsArgument<TArgument>).sourceType()
			: (this._definition.inner as TArgument);
	}
}
