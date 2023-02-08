import { TypeOf, ZodTypeAny } from 'zod';
import { Argument } from './Argument';
import { CastResult } from './ArgumentApi';
import { CastError } from '../CastError';

export abstract class CastableArgument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> extends Argument<
	TSchema,
	TDefinition
> {
	protected abstract _cast(value: string | undefined): TSchema['_input'] | undefined;

	protected _tryCast = (value: string | undefined): CastResult<TypeOf<TSchema>> => {
		try {
			const outputValue = this._cast(value);

			return {
				success: true,
				value: outputValue,
			};
		} catch (error: unknown) {
			if (typeof error === 'object' && error !== null && error instanceof CastError) {
				return {
					success: false,
					error,
				};
			}

			throw error;
		}
	};
}
