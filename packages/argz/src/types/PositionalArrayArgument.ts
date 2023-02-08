import { ArrayCardinality, RawCreateParams, ZodArray, ZodTypeAny } from 'zod';
import { PositionalArgument } from './PositionalArgument';

export class PositionalArrayArgument<
	TItemSchema extends ZodTypeAny,
	TCardinality extends ArrayCardinality = 'many',
> extends PositionalArgument<ZodArray<TItemSchema, TCardinality>> {
	public static create = <TItemSchema extends ZodTypeAny>(
		schema: TItemSchema,
		params?: RawCreateParams,
	): PositionalArrayArgument<TItemSchema> => {
		return new PositionalArrayArgument(ZodArray.create(schema, params), {});
	};
}
