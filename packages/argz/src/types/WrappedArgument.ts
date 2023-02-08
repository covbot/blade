import { ZodTypeAny } from 'zod';
import { ArgumentAny, Argument } from './Argument.internal';
import { ArgumentApi } from './ArgumentApi';

export type WrappedArgumentDefinition<TArgument extends ArgumentAny> = {
	inner: TArgument;
};

export class WrappedArgument<
	TArgument extends ArgumentAny = ArgumentAny,
	TSchema extends ZodTypeAny = ZodTypeAny,
> extends Argument<TSchema, WrappedArgumentDefinition<TArgument>> {
	public _getApi = (): ArgumentApi => {
		return this._definition.inner._getApi();
	};

	protected _unwrap = () => {
		return this._definition.inner;
	};
}
