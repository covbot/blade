import { ZodNullable } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class NullableArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodNullable<TArgument['_schema']>
> {
	public unwrap = this._unwrap;
}
