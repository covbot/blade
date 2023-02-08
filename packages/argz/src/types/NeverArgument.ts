import { RawCreateParams, ZodNever } from 'zod';
import { Argument } from './Argument.internal';
import { ArgumentApi } from './ArgumentApi';

export class NeverArgument extends Argument<ZodNever> {
	public static create(params?: RawCreateParams) {
		return new NeverArgument(ZodNever.create(params), {});
	}

	public _getApi = (): ArgumentApi => {
		throw new Error('Never argument api cannot be accessed');
	};
}
