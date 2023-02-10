import { objectKeyMask, ZodRawShape } from 'zod';
import { NullableArgument, type OptionalArgument } from './api';
import { Argument, ArgumentAny } from './types/Argument.internal';
import { UnionArgumentOptions } from './types/UnionArgument';

export namespace convertUtils {
	type UnionArgumentOptionsIntoZodInternal<T extends ArgumentAny[]> = T extends [infer THead, ...infer TTail]
		? THead extends ArgumentAny
			? TTail extends ArgumentAny[]
				? readonly [THead['_schema'], ...UnionArgumentOptionsIntoZodInternal<TTail>]
				: readonly [THead['_schema']]
			: never
		: readonly [];

	export type ConvertUnion<T extends UnionArgumentOptions> = T extends [infer THead, ...infer TTail]
		? THead extends ArgumentAny
			? TTail extends ArgumentAny[]
				? readonly [THead['_schema'], ...UnionArgumentOptionsIntoZodInternal<TTail>]
				: readonly [THead['_schema']]
			: never
		: never;

	export const convertUnion = <T extends UnionArgumentOptions>(value: T): ConvertUnion<T> => {
		return value.map((item) => item._schema) as ConvertUnion<T>;
	};

	export type RawObjectShape = Record<string, ArgumentAny>;

	export type ConvertShape<TShape extends RawObjectShape> = {
		[TKey in keyof TShape]: TShape[TKey]['_schema'];
	};

	export type AbstractShape<TShape extends ZodRawShape> = {
		[TKey in keyof TShape]: Argument<TShape[TKey], Record<string, unknown>>;
	};

	export const convertShape = <TShape extends RawObjectShape>(shape: TShape): ConvertShape<TShape> => {
		const entries = Object.entries(shape);

		return Object.fromEntries(entries.map(([key, argument]) => [key, argument._schema])) as ConvertShape<TShape>;
	};

	export type PickFromMask<TShape extends Record<string, unknown>, TMask extends objectKeyMask<TShape>> = Pick<
		TShape,
		Extract<keyof TShape, keyof TMask>
	>;

	export type NoNeverKeys<TShape extends Record<string, unknown>> = {
		[TKey in keyof TShape]: [TShape[TKey]] extends [never] ? never : TKey;
	}[keyof TShape];

	export type NoNever<TShape extends Record<string, unknown>> = {
		[TKey in NoNeverKeys<TShape>]: TShape[TKey];
	};

	export type RemoveOptional<TArgument extends ArgumentAny> = TArgument extends OptionalArgument<infer TInnerArgument>
		? RemoveOptional<TInnerArgument>
		: TArgument extends NullableArgument<infer TInnerArgument>
		? NullableArgument<RemoveOptional<TInnerArgument>>
		: TArgument;
}
