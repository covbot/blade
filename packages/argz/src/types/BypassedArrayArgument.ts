import { ArrayCardinality, RawCreateParams, ZodArray, ZodTypeAny } from 'zod';
import { BypassedArgument } from './BypassedArgument';

export class BypassedArrayArgument<
	TItemSchema extends ZodTypeAny,
	TCardinality extends ArrayCardinality = 'many',
> extends BypassedArgument<ZodArray<TItemSchema, TCardinality>> {
	public static create = <TItemSchema extends ZodTypeAny>(
		schema: TItemSchema,
		params?: RawCreateParams,
	): BypassedArrayArgument<TItemSchema> => {
		return new BypassedArrayArgument(ZodArray.create(schema, params), {});
	};
}
