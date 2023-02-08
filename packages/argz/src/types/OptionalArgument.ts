import { ZodOptional } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class OptionalArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodOptional<TArgument['_schema']>
> {
	public unwrap = this._unwrap;
}
