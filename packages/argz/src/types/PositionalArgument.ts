import { ZodTypeAny } from 'zod';
import { Argument } from './Argument';

export abstract class PositionalArgument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> extends Argument<
	TSchema,
	TDefinition
> {}
