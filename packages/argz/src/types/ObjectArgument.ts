import {
	extendShape,
	noUnrecognized,
	objectKeyMask,
	objectOutputType,
	RawCreateParams,
	UnknownKeysParam,
	util,
	ZodObject,
} from 'zod';
import { errorUtil } from 'zod/lib/helpers/errorUtil';
import { Argument, ArgumentAny } from './Argument.internal';
import { KeyValuePair } from './ArgumentApi';
import { GroupedArgument } from './GroupedArgument';
import { NamedArgumentDefinition } from './NamedArgument';
import { NeverArgument } from './NeverArgument';
import { OptionalArgument } from './OptionalArgument';
import { StringArgument } from './StringArgument';
import { UndefinedArgument } from './UndefinedArgument';
import { CastError } from '../CastError';
import { convertUtils } from '../convertUtils';

export type ObjectArgumentDefinition<TShape extends convertUtils.RawObjectShape, TCatchall extends Argument> = {
	catchall: TCatchall;
	shape: () => TShape;
} & NamedArgumentDefinition;

export class ObjectArgument<
	TShape extends convertUtils.RawObjectShape,
	TUnknownKeys extends UnknownKeysParam = 'strip',
	TCatchall extends Argument = ArgumentAny,
	TOutput = objectOutputType<convertUtils.ConvertShape<TShape>, TCatchall['_schema']>,
> extends GroupedArgument<
	ZodObject<convertUtils.ConvertShape<TShape>, TUnknownKeys, TCatchall['_schema'], TOutput>,
	ObjectArgumentDefinition<TShape, TCatchall>
> {
	private _cachedArgumentNameMap: Map<string, KeyValuePair<Argument>> | undefined = undefined;
	private _cachedConverter: ((key: string) => string) | undefined = undefined;
	private _cachedShape: TShape | undefined = undefined;

	private _getCachedShape = () => {
		if (!this._cachedShape) {
			this._cachedShape = this._definition.shape();
		}

		return this._cachedShape;
	};

	private _getArgumentNameMap = (getArgumentName: (key: string) => string): Map<string, KeyValuePair<Argument>> => {
		if (this._cachedArgumentNameMap && this._cachedConverter === getArgumentName) {
			return this._cachedArgumentNameMap;
		}

		const { keys } = this._schema._getCached();
		const shape = this._getCachedShape();

		const argumentNameMap = new Map<string, KeyValuePair<Argument>>();
		for (const key of keys) {
			const childSchema = shape[key];
			const childApi = childSchema?._getApi?.();

			if (childSchema && childApi?.named) {
				const childNames = childApi.named.getNames(key, getArgumentName);
				for (const childName of childNames) {
					argumentNameMap.set(childName, { key, value: childSchema });
				}
			}
		}

		this._cachedArgumentNameMap = argumentNameMap;
		this._cachedConverter = getArgumentName;
		return argumentNameMap;
	};

	protected _getChildArgument = (
		childName: string,
		getArgumentName: (key: string) => string,
	): KeyValuePair<Argument> | undefined => {
		const argumentNameMap = this._getArgumentNameMap(getArgumentName);

		if (argumentNameMap.has(childName)) {
			return argumentNameMap.get(childName);
		}

		if (!(this._definition.catchall instanceof NeverArgument)) {
			return { key: childName, value: this._definition.catchall };
		}

		if (this._schema._def.unknownKeys === 'passthrough') {
			// TODO: check this
			return { key: childName, value: StringArgument.create({ coerce: true }) };
		}

		if (this._schema._def.unknownKeys === 'strip') {
			return { key: childName, value: UndefinedArgument.create() };
		}

		return undefined;
	};

	protected _getIterableChildArguments = (): Array<KeyValuePair<Argument, string>> => {
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
	};

	protected _cast = (value: string | undefined) => {
		if (value === undefined) {
			return value;
		}

		try {
			return JSON.parse(value);
		} catch (error: unknown) {
			throw new CastError(`Cannot cast "${value}" into object.`, { cause: error });
		}
	};

	public get shape() {
		return this._getCachedShape();
	}

	public strict = (message?: errorUtil.ErrMessage): ObjectArgument<TShape, 'strict', TCatchall> => {
		return new ObjectArgument(this._schema.strict(message), this._definition);
	};

	public strip = (): ObjectArgument<TShape, 'strip', TCatchall> => {
		return new ObjectArgument(this._schema.strip(), this._definition);
	};

	public passthrough = (): ObjectArgument<TShape, 'passthrough', TCatchall> => {
		return new ObjectArgument(this._schema.passthrough(), this._definition);
	};

	public extend = <TExtension extends convertUtils.RawObjectShape>(
		extension: TExtension,
	): ObjectArgument<extendShape<TShape, TExtension>, TUnknownKeys, TCatchall> => {
		const extendedShape = () => ({ ...this._definition.shape(), ...extension });

		return new ObjectArgument<extendShape<TShape, TExtension>, TUnknownKeys, TCatchall>(
			this._schema.extend(convertUtils.convertShape(extension)),
			{
				...this._definition,
				shape: extendedShape,
			},
		);
	};

	public setKey = <TKey extends string, TSchema extends ArgumentAny>(
		key: TKey,
		schema: TSchema,
	): ObjectArgument<extendShape<TShape, Record<TKey, TSchema>>, TUnknownKeys, TCatchall> => {
		return this.extend({ [key]: schema } as Record<TKey, TSchema>);
	};

	public catchall = <TIndex extends ArgumentAny>(index: TIndex): ObjectArgument<TShape, TUnknownKeys, TIndex> => {
		return new ObjectArgument(this._schema.catchall<TIndex['_schema']>(index._schema), {
			...this._definition,
			catchall: index,
		});
	};

	public pick = <TMask extends objectKeyMask<TShape>>(
		mask: noUnrecognized<TMask, TShape>,
	): ObjectArgument<convertUtils.PickFromMask<TShape, TMask>, TUnknownKeys, TCatchall> => {
		const newShape = {} as convertUtils.PickFromMask<TShape, TMask>;

		const keys = util.objectKeys(mask) as Array<keyof convertUtils.PickFromMask<TShape, TMask>>;
		for (const key of keys) {
			const value = this.shape[key];
			if (mask[key] && value) {
				newShape[key] = value;
			}
		}

		const convertedShape = () => convertUtils.convertShape(newShape);

		return new ObjectArgument(new ZodObject({ ...this._schema._def, shape: convertedShape }), {
			...this._definition,
			shape: () => newShape,
		});
	};

	public omit = <TMask extends objectKeyMask<TShape>>(
		mask: noUnrecognized<TMask, TShape>,
	): ObjectArgument<Omit<TShape, keyof TMask>, TUnknownKeys, TCatchall> => {
		const newShape = {} as Omit<TShape, keyof TMask>;

		for (const key of util.objectKeys(this.shape)) {
			if (!mask[key]) {
				(newShape as Record<string, Argument>)[key] = this.shape[key]!;
			}
		}

		const convertedShape = () => convertUtils.convertShape(newShape);

		return new ObjectArgument(new ZodObject({ ...this._schema._def, shape: convertedShape }), {
			...this._definition,
			shape: () => newShape,
		});
	};

	public partial(): ObjectArgument<
		{ [TKey in keyof TShape]: OptionalArgument<TShape[TKey]> },
		TUnknownKeys,
		TCatchall
	>;
	public partial<TMask extends objectKeyMask<TShape>>(
		mask: noUnrecognized<TMask, TShape>,
	): ObjectArgument<
		convertUtils.NoNever<{
			[TKey in keyof TShape]: TKey extends keyof TMask ? OptionalArgument<TShape[TKey]> : TShape[TKey];
		}>,
		TUnknownKeys,
		TCatchall
	>;
	public partial<TMask extends objectKeyMask<TShape>>(mask?: noUnrecognized<TMask, TShape>) {
		const newShape: convertUtils.RawObjectShape = {};

		for (const key of util.objectKeys(this.shape)) {
			const fieldSchema = this.shape[key];
			if (!fieldSchema) {
				continue;
			}

			if (mask && !mask[key]) {
				newShape[key] = fieldSchema;
			} else {
				newShape[key] = fieldSchema!.optional();
			}
		}

		const convertedShape = () => convertUtils.convertShape(newShape);

		return new ObjectArgument(
			new ZodObject({
				...this._schema._def,
				shape: convertedShape,
			}),
			{ ...this._definition, shape: () => newShape },
		);
	}

	public required(): ObjectArgument<
		{ [TKey in keyof TShape]: convertUtils.RemoveOptional<TShape[TKey]> },
		TUnknownKeys,
		TCatchall
	>;
	public required<TMask extends objectKeyMask<TShape>>(
		mask: noUnrecognized<TMask, TShape>,
	): ObjectArgument<
		convertUtils.NoNever<{
			[TKey in keyof TShape]: TKey extends keyof TMask ? convertUtils.RemoveOptional<TShape[TKey]> : TShape[TKey];
		}>,
		TUnknownKeys,
		TCatchall
	>;
	public required<TMask extends objectKeyMask<TShape>>(mask?: noUnrecognized<TMask, TShape>) {
		const newShape: convertUtils.RawObjectShape = {};

		for (const key of util.objectKeys(this.shape)) {
			const fieldSchema = this.shape[key];

			if (!fieldSchema) {
				continue;
			}

			if (mask && !mask[key]) {
				newShape[key] = fieldSchema;
			} else {
				let requiredField = fieldSchema;
				while (requiredField instanceof OptionalArgument) {
					requiredField = requiredField.unwrap();
				}

				newShape[key] = requiredField;
			}
		}

		const convertedShape = () => convertUtils.convertShape(newShape);

		return new ObjectArgument(new ZodObject({ ...this._schema._def, shape: convertedShape }), {
			...this._definition,
			shape: () => newShape,
		});
	}

	public static create<TShape extends convertUtils.RawObjectShape>(
		shape: TShape,
		params?: RawCreateParams & { name?: string },
	): ObjectArgument<TShape> {
		return new ObjectArgument<TShape>(ZodObject.create(convertUtils.convertShape(shape), params), {
			defaultName: params?.name,
			aliases: [],
			shape: () => shape,
			catchall: NeverArgument.create(),
		});
	}

	public static strictCreate<TShape extends convertUtils.RawObjectShape>(
		shape: TShape,
		params?: RawCreateParams & { name?: string },
	): ObjectArgument<TShape, 'strict'> {
		return new ObjectArgument<TShape, 'strict'>(ZodObject.strictCreate(convertUtils.convertShape(shape), params), {
			defaultName: params?.name,
			aliases: [],
			shape: () => shape,
			catchall: NeverArgument.create(),
		});
	}

	public static lazycreate<TShape extends convertUtils.RawObjectShape>(
		shape: () => TShape,
		params?: RawCreateParams & { name?: string },
	): ObjectArgument<TShape> {
		const convertedShape = () => convertUtils.convertShape(shape());
		return new ObjectArgument<TShape>(ZodObject.lazycreate(convertedShape, params), {
			defaultName: params?.name,
			aliases: [],
			shape,
			catchall: NeverArgument.create(),
		});
	}
}

export const object = ObjectArgument.create;
