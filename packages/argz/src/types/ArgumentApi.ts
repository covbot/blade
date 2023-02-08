import { ZodTypeAny } from 'zod';
import { ArgumentAny } from './Argument';
import { CastError } from '../CastError';

export enum ArgumentType {
	NAMED,
	POSITIONAL,
	BYPASSED,
	GROUP,
}

export type CastResult<TValue> =
	| {
			success: true;
			value: TValue;
	  }
	| {
			success: false;
			error: CastError;
	  };

export type GeneralArgumentApi = {
	getSchema(argumentName: string | undefined): ZodTypeAny;
};

export interface CastableArgumentApi extends GeneralArgumentApi {
	cast(value: string | undefined): unknown;
	tryCast(value: string | undefined): CastResult<unknown>;
}

export type KeyValuePair<TValue, TKey = string> = {
	key: TKey;
	value: TValue;
};

export interface NamedArgumentApi extends CastableArgumentApi {
	type: ArgumentType.NAMED;
	getNames(parentKey: string | undefined, getArgumentName: (key: string) => string): string[];
}

export interface GroupedArgumentApi extends Omit<NamedArgumentApi, 'type'> {
	type: ArgumentType.GROUP;
	getChildArgument(
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<ArgumentAny> | undefined;
	getIterableChildArguments(): Array<KeyValuePair<ArgumentAny>>;
}

export interface PositionalArgumentApi extends GeneralArgumentApi {
	type: ArgumentType.POSITIONAL;
}

export interface BypassedArgumentApi extends GeneralArgumentApi {
	type: ArgumentType.BYPASSED;
}

export type ArgumentApi = NamedArgumentApi | GroupedArgumentApi | PositionalArgumentApi | BypassedArgumentApi;

export const isCastableApi = (api: ArgumentApi): api is NamedArgumentApi | GroupedArgumentApi =>
	[ArgumentType.NAMED, ArgumentType.GROUP].includes(api.type);

export const isNamedApi = isCastableApi;
