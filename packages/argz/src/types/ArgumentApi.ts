import { ZodTypeAny } from 'zod';
import { ArgumentAny } from './Argument.internal';
import { CastError } from '../CastError';

export enum ArgumentType {
	NAMED = 'named',
	POSITIONAL = 'positional',
	BYPASSED = 'bypassed',
	GROUP = 'grouped',
	CASTABLE = 'castable',
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

export type CommonArgumentApi = {
	getSchema(argumentName: string | undefined): ZodTypeAny;
};

export type CastableArgumentApi = {
	cast(value: string | undefined): unknown;
	tryCast(value: string | undefined): CastResult<unknown>;
};

export type KeyValuePair<TValue, TKey = string> = {
	key: TKey;
	value: TValue;
};

export type NamedArgumentApi = {
	getNames(parentKey: string | undefined, getArgumentName: (key: string) => string): string[];
};

export type GroupedArgumentApi = {
	getChildArgument(
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<ArgumentAny> | undefined;
	getIterableChildArguments(): Array<KeyValuePair<ArgumentAny>>;
};

export type ArgumentApi = {
	type: ArgumentType;
	common: CommonArgumentApi;
	castable?: CastableArgumentApi;
	named?: NamedArgumentApi;
	grouped?: GroupedArgumentApi;
};
