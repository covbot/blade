import { ArgumentAny } from './types/Argument.internal';
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
}
