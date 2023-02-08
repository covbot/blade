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
}
