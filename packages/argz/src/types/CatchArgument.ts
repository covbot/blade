import { ZodCatch } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class CatchArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodCatch<TArgument['_schema']>
> {
	public removeCatch = this._unwrap;
}
