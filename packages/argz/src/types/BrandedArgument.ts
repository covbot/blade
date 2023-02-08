import { ZodBranded } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class BrandedArgument<
	TArgument extends ArgumentAny,
	TBrand extends string | number | symbol,
> extends WrappedArgument<TArgument, ZodBranded<TArgument['_schema'], TBrand>> {
	public unwrap = this._unwrap;
}
