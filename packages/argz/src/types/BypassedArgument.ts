import { ZodTypeAny } from 'zod';
import { Argument } from './Argument';

export abstract class BypassedArgument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> extends Argument<
	TSchema,
	TDefinition
> {}
