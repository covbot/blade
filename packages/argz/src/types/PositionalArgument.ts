import { ZodTypeAny } from 'zod';
import { Argument } from './Argument';
import { ArgumentApi, ArgumentType } from './ArgumentApi';

export abstract class PositionalArgument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> extends Argument<
	TSchema,
	TDefinition
> {
	public _getApi = (): ArgumentApi => {
		return {
			type: ArgumentType.POSITIONAL,
			getSchema: this._getSchema,
		};
	};
}
