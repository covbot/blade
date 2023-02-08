import {
	util,
	ZodBranded,
	ZodCatch,
	ZodDefault,
	ZodNullable,
	ZodOptional,
	ZodTypeAny,
	output,
	input,
	ZodEffects,
	ZodFirstPartyTypeKind,
	RefinementCtx,
	CustomErrorParams,
	IssueData,
} from 'zod';
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
		this.describe = this.describe.bind(this);
		this.superRefine = this.superRefine.bind(this);
		this.refine = this.refine.bind(this);
		this.refinement = this.refinement.bind(this);
		this.transform = this.transform.bind(this);
		this.default = this.default.bind(this);
		this.catch = this.catch.bind(this);
		this.brand = this.brand.bind(this);
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

	public superRefine<TRefinedOutput extends output<TSchema>>(
		refinement: (output: output<TSchema>, context: RefinementCtx) => output is TRefinedOutput,
	): EffectsArgument<this, TRefinedOutput, input<TSchema>>;
	public superRefine(
		refinement: (output: output<TSchema>, context: RefinementCtx) => void,
	): EffectsArgument<this, output<TSchema>, input<TSchema>>;
	public superRefine(
		refinement: (output: output<TSchema>, context: RefinementCtx) => unknown,
	): EffectsArgument<this, output<TSchema>, input<TSchema>> {
		return new EffectsArgument(this._schema.superRefine(refinement), { inner: this });
	}

	public refine<TRefinedOutput extends output<TSchema>>(
		check: (oldOutput: output<TSchema>) => oldOutput is TRefinedOutput,
		message?: string | CustomErrorParams | ((oldOutput: output<TSchema>) => CustomErrorParams),
	): EffectsArgument<this, TRefinedOutput, input<TSchema>>;
	public refine(
		check: (oldOutput: output<TSchema>) => unknown | Promise<unknown>,
		message?: string | CustomErrorParams | ((oldOutput: output<TSchema>) => CustomErrorParams),
	): EffectsArgument<this, output<TSchema>, input<TSchema>>;
	public refine(
		check: (oldOutput: output<TSchema>) => unknown,
		message?: string | CustomErrorParams | ((oldOutput: output<TSchema>) => CustomErrorParams),
	): EffectsArgument<this, output<TSchema>, input<TSchema>> {
		return new EffectsArgument(this._schema.refine(check, message), { inner: this });
	}

	public refinement<TRefinedOutput extends output<TSchema>>(
		check: (oldOutput: output<TSchema>) => oldOutput is TRefinedOutput,
		refinementData: IssueData | ((oldOutput: output<TSchema>, ctx: RefinementCtx) => IssueData),
	): EffectsArgument<this, TRefinedOutput, input<TSchema>>;
	public refinement(
		check: (oldOutput: output<TSchema>) => boolean,
		refinementData: IssueData | ((oldOutput: output<TSchema>, ctx: RefinementCtx) => IssueData),
	): EffectsArgument<this, output<TSchema>, input<TSchema>>;
	public refinement(
		check: (oldOutput: output<TSchema>) => boolean,
		refinementData: IssueData | ((oldOutput: output<TSchema>, ctx: RefinementCtx) => IssueData),
	): EffectsArgument<this, output<TSchema>, input<TSchema>> {
		return new EffectsArgument(this._schema.refinement(check, refinementData), { inner: this });
	}

	public transform<TNewOutput>(
		transform: (currentOutput: output<TSchema>, context: RefinementCtx) => TNewOutput | Promise<TNewOutput>,
	): EffectsArgument<this, TNewOutput> {
		return new EffectsArgument(this._schema.transform(transform), { inner: this });
	}

	public default(defaultValue: util.noUndefined<input<TSchema>>): DefaultArgument<this>;
	public default(defaultValue: () => util.noUndefined<input<TSchema>>): DefaultArgument<this>;
	public default(
		defaultValue: util.noUndefined<input<TSchema>> | (() => util.noUndefined<input<TSchema>>),
	): DefaultArgument<this> {
		return new DefaultArgument(this._schema.default(defaultValue), { inner: this });
	}

	public catch(defaultValue: output<TSchema>): CatchArgument<this>;
	public catch(defaultValue: () => output<TSchema>): CatchArgument<this>;
	public catch(defaultValue: output<TSchema> | (() => output<TSchema>)): CatchArgument<this> {
		return new CatchArgument(this._schema.catch(defaultValue), { inner: this });
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

export class CatchArgument<TArgument extends ArgumentAny> extends WrappedArgument<
	TArgument,
	ZodCatch<TArgument['_schema']>
> {
	public removeCatch = this._unwrap;
}

export class EffectsArgument<
	TArgument extends ArgumentAny,
	TOutput = output<TArgument['_schema']>,
	TInput = input<TArgument['_schema']>,
> extends WrappedArgument<TArgument, ZodEffects<TArgument['_schema'], TOutput, TInput>> {
	public innerType = this._unwrap;

	sourceType(): TArgument {
		return this._definition.inner._schema.typeName === ZodFirstPartyTypeKind.ZodEffects
			? (this._definition.inner as unknown as EffectsArgument<TArgument>).sourceType()
			: (this._definition.inner as TArgument);
	}
}
