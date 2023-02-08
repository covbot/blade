import { objectOutputType, RawCreateParams, UnknownKeysParam, ZodNever, ZodObject } from 'zod';
import { CastError } from '../CastError';
import { objectUtil } from '../objectUtil';
import { Argument } from './Argument';
import { ArgumentGroup, KeyValuePair } from './ArgumentGroup';
import { CastableArgument } from './CastableArgument';
import { NamedArgument, NamedArgumentDefinition } from './NamedArgument';
import { NeverArgument } from './NeverArgument';
import { StringArgument } from './StringArgument';

export type ObjectArgumentDefinition<TShape extends objectUtil.ObjectArgumentRawShape, TCatchall extends Argument> = {
	catchall: TCatchall;
	shape: () => TShape;
} & NamedArgumentDefinition;

export class ObjectArgument<
	TShape extends objectUtil.ObjectArgumentRawShape,
	TUnknownKeys extends UnknownKeysParam = 'strip',
	TCatchall extends CastableArgument = CastableArgument,
	TOutput = objectOutputType<objectUtil.ConvertShape<TShape>, TCatchall['_schema']>,
> extends ArgumentGroup<
	ZodObject<objectUtil.ConvertShape<TShape>, TUnknownKeys, TCatchall['_schema'], TOutput>,
	ObjectArgumentDefinition<TShape, TCatchall>
> {
	private _cachedArgumentNameMap: Map<string, KeyValuePair<NamedArgument>> | undefined = undefined;
	private _cachedConverter: ((key: string) => string) | undefined = undefined;
	private _cachedShape: TShape | undefined = undefined;

	private _getCachedShape = () => {
		if (!this._cachedShape) {
			this._cachedShape = this._definition.shape();
		}

		return this._cachedShape;
	};

	private _getArgumentNameMap = (
		getArgumentName: (key: string) => string,
	): Map<string, KeyValuePair<NamedArgument>> => {
		if (this._cachedArgumentNameMap && this._cachedConverter === getArgumentName) {
			return this._cachedArgumentNameMap;
		}

		const { keys } = this._schema._getCached();
		const shape = this._getCachedShape();

		const argumentNameMap = new Map<string, KeyValuePair<NamedArgument>>();
		for (const key of keys) {
			const childSchema = shape[key];

			if (childSchema && childSchema instanceof NamedArgument) {
				const childNames = childSchema._getNames(key, getArgumentName);
				for (const childName of childNames) {
					argumentNameMap.set(childName, { key, value: childSchema });
				}
			}
		}

		this._cachedArgumentNameMap = argumentNameMap;
		this._cachedConverter = getArgumentName;
		return argumentNameMap;
	};

	public _getChildArgument(
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<CastableArgument> | undefined {
		const argumentNameMap = this._getArgumentNameMap(getArgumentName);

		if (argumentNameMap.has(childName)) {
			return argumentNameMap.get(childName);
		}

		if (!(this._schema._def.catchall instanceof ZodNever)) {
			return { key: childName, value: this._definition.catchall };
		}

		if (this._schema._def.unknownKeys === 'passthrough') {
			// TODO: check this
			return { key: childName, value: StringArgument.create({ coerce: true }) };
		}

		if (this._schema._def.unknownKeys === 'strip') {
			// TODO: think of what here could be
		}

		return undefined;
	}

	public _getIterableChildArguments(): Array<KeyValuePair<Argument, string>> {
		const { keys } = this._schema._getCached();
		const shape = this._getCachedShape();

		const output: Array<KeyValuePair<Argument>> = [];
		for (const key of keys) {
			const schema = shape[key];
			if (schema) {
				output.push({ key, value: schema });
			}
		}

		return output;
	}

	public _cast(value: string | undefined) {
		if (value === undefined) {
			return value;
		}

		try {
			return JSON.parse(value);
		} catch (error: unknown) {
			throw new CastError(`Cannot cast "${value}" into object.`, { cause: error });
		}
	}

	public static create<TShape extends objectUtil.ObjectArgumentRawShape>(
		shape: TShape,
		params?: RawCreateParams,
	): ObjectArgument<TShape> {
		const constructedArgument = new ObjectArgument<TShape>(
			ZodObject.create(objectUtil.convertShape(shape), params),
			{
				aliases: [],
				shape: () => shape,
				catchall: NeverArgument.create(),
			},
		);

		return constructedArgument;
	}
}

export const object = ObjectArgument.create;
