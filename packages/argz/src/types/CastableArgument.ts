import { TypeOf, ZodTypeAny } from 'zod';
import { Argument } from './Argument.internal';
import { ArgumentApi, ArgumentType, CastResult } from './ArgumentApi';
import { CastError } from '../CastError';

export abstract class CastableArgument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> extends Argument<
	TSchema,
	TDefinition
> {
	public constructor(schema: TSchema, definition: TDefinition) {
		super(schema, definition);
		this._getApi = this._getApi.bind(this);
	}

	protected abstract _cast(value: string | undefined): unknown;

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

	public _getApi(): ArgumentApi {
		return {
			type: ArgumentType.CASTABLE,
			common: {
				getSchema: this._getSchema,
			},
			castable: {
				cast: this._cast,
				tryCast: this._tryCast,
			},
		};
	}
}
