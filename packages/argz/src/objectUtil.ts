import { ArgumentAny } from './types/Argument';

export namespace objectUtil {
	export type ObjectArgumentRawShape = Record<string, ArgumentAny>;

	export type ConvertShape<TShape extends ObjectArgumentRawShape> = {
		[TKey in keyof TShape]: TShape[TKey]['_schema'];
	};

	export const convertShape = <TShape extends ObjectArgumentRawShape>(shape: TShape): ConvertShape<TShape> => {
		const entries = Object.entries(shape);

		return Object.fromEntries(entries.map(([key, argument]) => [key, argument._schema])) as ConvertShape<TShape>;
	};
}
