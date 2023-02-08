import { RawCreateParams, ZodNever } from 'zod';
import { CastError } from '../CastError';
import { CastableArgument } from './CastableArgument';

export class NeverArgument extends CastableArgument<ZodNever> {
	protected _cast(): never {
		throw new CastError('Value is never - cannot cast');
	}

	public static create(params?: RawCreateParams) {
		return new NeverArgument(ZodNever.create(params), {});
	}
}
