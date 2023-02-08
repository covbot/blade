import { ZodTypeAny } from 'zod';
import { Argument } from './Argument.internal';
import { ArgumentApi, ArgumentType } from './ArgumentApi';

export abstract class BypassedArgument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> extends Argument<
	TSchema,
	TDefinition
> {
	public _getApi = (): ArgumentApi => {
		return {
			type: ArgumentType.BYPASSED,
			getSchema: this._getSchema,
		};
	};
}
