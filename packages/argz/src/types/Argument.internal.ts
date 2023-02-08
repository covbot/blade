/* eslint-disable @typescript-eslint/ban-ts-comment */
/**
 * This file contains @ts-no-check comments, due to issues with classes in TypeScript.
 * Each argument must extend from Argument class. However, if we implement some method
 * in Argument class, which returns some derived class B, these two classes must be in
 * the same file. So in this file, we just declare methods - their implementations are
 * in Argument.implementation.ts file.
 */
import { util, ZodTypeAny, output, input, RefinementCtx, CustomErrorParams, IssueData } from 'zod';
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
	protected _getSchema = (_rawArgumentName: string): TSchema => {
		return this._schema;
	};

	public abstract _getApi(): ArgumentApi;

	public describe(description: string): this {
		const schema = this._schema.describe(description);

		return this._clone(schema);
	}

	public superRefine<TRefinedOutput extends output<TSchema>>(
		refinement: (output: output<TSchema>, context: RefinementCtx) => output is TRefinedOutput,
	): import('./EffectsArgument').EffectsArgument<this, TRefinedOutput, input<TSchema>>;
	// @ts-expect-error
	public superRefine(
		refinement: (output: output<TSchema>, context: RefinementCtx) => void,
	): import('./EffectsArgument').EffectsArgument<this, output<TSchema>, input<TSchema>>;

	public refine<TRefinedOutput extends output<TSchema>>(
		check: (oldOutput: output<TSchema>) => oldOutput is TRefinedOutput,
		message?: string | CustomErrorParams | ((oldOutput: output<TSchema>) => CustomErrorParams),
	): import('./EffectsArgument').EffectsArgument<this, TRefinedOutput, input<TSchema>>;
	// @ts-expect-error
	public refine(
		check: (oldOutput: output<TSchema>) => unknown | Promise<unknown>,
		message?: string | CustomErrorParams | ((oldOutput: output<TSchema>) => CustomErrorParams),
	): import('./EffectsArgument').EffectsArgument<this, output<TSchema>, input<TSchema>>;

	public refinement<TRefinedOutput extends output<TSchema>>(
		check: (oldOutput: output<TSchema>) => oldOutput is TRefinedOutput,
		refinementData: IssueData | ((oldOutput: output<TSchema>, ctx: RefinementCtx) => IssueData),
	): import('./EffectsArgument').EffectsArgument<this, TRefinedOutput, input<TSchema>>;
	// @ts-expect-error
	public refinement(
		check: (oldOutput: output<TSchema>) => boolean,
		refinementData: IssueData | ((oldOutput: output<TSchema>, ctx: RefinementCtx) => IssueData),
	): import('./EffectsArgument').EffectsArgument<this, output<TSchema>, input<TSchema>>;

	// @ts-expect-error
	public transform<TNewOutput>(
		transform: (currentOutput: output<TSchema>, context: RefinementCtx) => TNewOutput | Promise<TNewOutput>,
	): import('./EffectsArgument').EffectsArgument<this, TNewOutput>;

	public default(defaultValue: util.noUndefined<input<TSchema>>): import('./DefaultArgument').DefaultArgument<this>;
	// @ts-expect-error
	public default(
		defaultValue: () => util.noUndefined<input<TSchema>>,
	): import('./DefaultArgument').DefaultArgument<this>;

	public catch(defaultValue: output<TSchema>): import('./CatchArgument').CatchArgument<this>;
	// @ts-expect-error
	public catch(defaultValue: () => output<TSchema>): import('./CatchArgument').CatchArgument<this>;

	// @ts-expect-error
	public brand<TBrand extends string | number | symbol>(
		brand?: TBrand,
	): import('./BrandedArgument').BrandedArgument<this, TBrand>;

	// @ts-expect-error
	public optional(): import('./OptionalArgument').OptionalArgument<this>;

	// @ts-expect-error
	public nullable(): import('./NullableArgument').NullableArgument<this>;

	// @ts-expect-error
	public nullish(): import('./OptionalArgument').OptionalArgument<
		import('./NullableArgument').NullableArgument<this>
	>;

	// @ts-expect-error
	public or<T extends ArgumentAny>(option: T): import('./UnionArgument').UnionArgument<[this, T]>;
}
