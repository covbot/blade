import { ArgumentApi } from './types/ArgumentApi';

export namespace argumentUtils {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export type AnyFunction = (...args: any[]) => any;

	export const wrap = <T extends AnyFunction, V>(
		method: T,
		wrapper: (type: ReturnType<T>) => V,
	): ((...args: Parameters<T>) => V) => {
		return (...args: Parameters<T>) => {
			return wrapper(method(...args));
		};
	};

	export type ArgumentApiFeatures = keyof Omit<ArgumentApi, 'type' | 'common'>;

	export type AssertedArgumentFeatures<TFeatures extends ArgumentApiFeatures> = {
		[TKey in keyof Required<ArgumentApi>]: TKey extends ArgumentApiFeatures
			? TKey extends TFeatures
				? Required<ArgumentApi>[TKey]
				: ArgumentApi[TKey] | undefined
			: ArgumentApi[TKey];
	};

	type ConvertArrayIntoUnion<TPossibilities, TArray extends readonly TPossibilities[]> = TArray extends [
		infer THead,
		...infer TTail,
	]
		? THead extends TPossibilities
			? TTail extends TPossibilities[]
				? THead | ConvertArrayIntoUnion<TPossibilities, TTail>
				: never
			: never
		: never;

	export const checkApiFeatures = <TFeatures extends readonly [ArgumentApiFeatures, ...ArgumentApiFeatures[]]>(
		api: ArgumentApi,
		features: TFeatures,
	): api is AssertedArgumentFeatures<ConvertArrayIntoUnion<ArgumentApiFeatures, TFeatures>> => {
		for (const feature of features) {
			if (!api[feature]) {
				return false;
			}
		}

		return true;
	};
}
