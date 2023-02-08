import { ZodDefault } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class DefaultArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodDefault<TArgument['_schema']>
> {
	public removeDefault = this._unwrap;
}
