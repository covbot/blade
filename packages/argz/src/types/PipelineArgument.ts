import { ZodPipeline, ZodTypeAny } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { WrappedArgument } from './WrappedArgument';

export class PipelineArgument<TArgument extends ArgumentAny, TZodSchema extends ZodTypeAny> extends WrappedArgument<
	TArgument,
	ZodPipeline<TArgument['_schema'], TZodSchema>
> {
	public static create<TArgument extends ArgumentAny, TZodSchema extends ZodTypeAny>(
		argument: TArgument,
		schema: TZodSchema,
	): PipelineArgument<TArgument, TZodSchema> {
		return new PipelineArgument(ZodPipeline.create(argument._schema, schema), { inner: argument });
	}
}
