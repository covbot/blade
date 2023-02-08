import { util, ZodBranded, ZodDefault, ZodNullable, ZodOptional, ZodTypeAny } from 'zod';
import { ArgumentApi } from './ArgumentApi';

interface ArgumentConstructor<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> {
	new (schema: TSchema, definition: TDefinition): Argument<TSchema, TDefinition>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ArgumentAny = Argument<any, any>;

export abstract class Argument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> {
	public readonly _schema: TSchema;
	protected readonly _definition: TDefinition;

	public constructor(schema: TSchema, definition: TDefinition) {
		this._schema = schema;
		this._definition = definition;
		this._clone = this._clone.bind(this);
		this.default = this.default.bind(this);
		this.describe = this.describe.bind(this);
		this.optional = this.optional.bind(this);
		this.nullable = this.nullable.bind(this);
		this.nullish = this.nullish.bind(this);
	}

	protected _clone(schema?: TSchema, definition?: TDefinition): this {
		schema ??= this._schema;
		definition ??= this._definition;

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const This = this.constructor as ArgumentConstructor<TSchema, TDefinition>;

		return new This(schema, definition) as this;
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public _getSchema = (_rawArgumentName: string): TSchema => {
		return this._schema;
	};

	public abstract _getApi(): ArgumentApi;

	public describe(description: string): this {
		const schema = this._schema.describe(description);

		return this._clone(schema);
	}

	public default(defaultValue: util.noUndefined<TSchema['_input']>): DefaultArgument<this>;
	public default(defaultValue: () => util.noUndefined<TSchema['_input']>): DefaultArgument<this>;
	public default(
		defaultValue: util.noUndefined<TSchema['_input']> | (() => util.noUndefined<TSchema['_input']>),
	): DefaultArgument<this> {
		return new DefaultArgument(this._schema.default(defaultValue), { inner: this });
	}

	public brand<TBrand extends string | number | symbol>(brand?: TBrand): BrandedArgument<this, TBrand> {
		return new BrandedArgument(this._schema.brand(brand), { inner: this });
	}

	public optional(): OptionalArgument<this> {
		return new OptionalArgument(this._schema.optional(), { inner: this });
	}

	public nullable(): NullableArgument<this> {
		return new NullableArgument(this._schema.nullable(), { inner: this });
	}

	public nullish(): OptionalArgument<NullableArgument<this>> {
		return this.nullable().optional();
	}
}

export type WrappedArgumentDefinition<TArgument extends ArgumentAny> = {
	inner: TArgument;
};

export class WrappedArgument<
	TArgument extends ArgumentAny = ArgumentAny,
	TSchema extends ZodTypeAny = ZodTypeAny,
> extends Argument<TSchema, WrappedArgumentDefinition<TArgument>> {
	public _getApi = (): ArgumentApi => {
		return this._definition.inner._getApi();
	};

	protected _unwrap = () => {
		return this._definition.inner;
	};
}

export class DefaultArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodDefault<TArgument['_schema']>
> {
	public removeDefault = this._unwrap;
}

export class BrandedArgument<
	TArgument extends ArgumentAny,
	TBrand extends string | number | symbol,
> extends WrappedArgument<TArgument, ZodBranded<TArgument['_schema'], TBrand>> {
	public unwrap = this._unwrap;
}

export class NullableArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodNullable<TArgument['_schema']>
> {
	public unwrap = this._unwrap;
}

export class OptionalArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodOptional<TArgument['_schema']>
> {
	public unwrap = this._unwrap;
}
