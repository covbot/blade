import {
	ZodTypeAny,
	RefinementCtx,
	output,
	input,
	CustomErrorParams,
	IssueData,
	util,
	ParseParams,
	SafeParseReturnType,
} from 'zod';
import { Argument, ArgumentAny } from './Argument.internal';
import { ArgumentVector } from './ArgumentVector';
import { BrandedArgument } from './BrandedArgument';
import { CatchArgument } from './CatchArgument';
import { DefaultArgument } from './DefaultArgument';
import { EffectsArgument } from './EffectsArgument';
import { NullableArgument } from './NullableArgument';
import { OptionalArgument } from './OptionalArgument';
import { PipelineArgument } from './PipelineArgument';
import { UnionArgument } from './UnionArgument';

Argument.prototype.superRefine = function (
	this: ArgumentAny,
	refinement: (output: output<ZodTypeAny>, context: RefinementCtx) => unknown,
): EffectsArgument<ArgumentAny, output<ZodTypeAny>, input<ZodTypeAny>> {
	return new EffectsArgument(this._schema.superRefine(refinement), { inner: this });
};

Argument.prototype.refine = function (
	this: ArgumentAny,
	check: (oldOutput: output<ZodTypeAny>) => unknown,
	message?: string | CustomErrorParams | ((oldOutput: output<ZodTypeAny>) => CustomErrorParams),
): EffectsArgument<ArgumentAny, output<ZodTypeAny>, input<ZodTypeAny>> {
	return new EffectsArgument(this._schema.refine(check, message), { inner: this });
};

Argument.prototype.refinement = function (
	this: ArgumentAny,
	check: (oldOutput: output<ZodTypeAny>) => boolean,
	refinementData: IssueData | ((oldOutput: output<ZodTypeAny>, ctx: RefinementCtx) => IssueData),
): EffectsArgument<ArgumentAny, output<ZodTypeAny>, input<ZodTypeAny>> {
	return new EffectsArgument(this._schema.refinement(check, refinementData), { inner: this });
};

Argument.prototype.transform = function <TNewOutput>(
	this: ArgumentAny,
	transform: (currentOutput: output<ZodTypeAny>, context: RefinementCtx) => TNewOutput | Promise<TNewOutput>,
): EffectsArgument<ArgumentAny, TNewOutput> {
	return new EffectsArgument(this._schema.transform(transform), { inner: this });
};

Argument.prototype.default = function (
	this: ArgumentAny,
	defaultValue: util.noUndefined<input<ZodTypeAny>> | (() => util.noUndefined<input<ZodTypeAny>>),
): DefaultArgument<ArgumentAny> {
	return new DefaultArgument(this._schema.default(defaultValue), { inner: this });
};

Argument.prototype.catch = function (
	defaultValue: output<ZodTypeAny> | (() => output<ZodTypeAny>),
): CatchArgument<ArgumentAny> {
	return new CatchArgument(this._schema.catch(defaultValue), { inner: this });
};

Argument.prototype.brand = function <TBrand extends string | number | symbol>(
	this: ArgumentAny,
	brand?: TBrand,
): BrandedArgument<ArgumentAny, TBrand> {
	return new BrandedArgument(this._schema.brand(brand), { inner: this });
};

Argument.prototype.optional = function (this: ArgumentAny): OptionalArgument<ArgumentAny> {
	return new OptionalArgument(this._schema.optional(), { inner: this });
};

Argument.prototype.nullable = function (this: ArgumentAny): NullableArgument<ArgumentAny> {
	return new NullableArgument(this._schema.nullable(), { inner: this });
};

Argument.prototype.nullish = function (this: Argument) {
	return this.nullable().optional();
};

Argument.prototype.or = function <T extends ArgumentAny>(this: Argument, option: T): UnionArgument<[Argument, T]> {
	return UnionArgument.create([this, option], this._schema._def);
};

Argument.prototype.pipe = function <T extends ZodTypeAny>(this: Argument, schema: T): PipelineArgument<Argument, T> {
	return PipelineArgument.create(this, schema);
};

Argument.prototype.parse = function (
	this: ArgumentAny,
	data: unknown,
	params?: Partial<ParseParams>,
): output<ArgumentAny['_schema']> {
	return ArgumentVector.create(this).parse(data, params);
};

Argument.prototype.safeParse = function (
	this: ArgumentAny,
	data: unknown,
	params?: Partial<ParseParams>,
): SafeParseReturnType<input<ArgumentAny['_schema']>, output<ArgumentAny['_schema']>> {
	return ArgumentVector.create(this).safeParse(data, params);
};

Argument.prototype.parseAsync = function (
	this: ArgumentAny,
	data: unknown,
	params?: Partial<ParseParams>,
): Promise<output<ArgumentAny['_schema']>> {
	return ArgumentVector.create(this).parseAsync(data, params);
};

Argument.prototype.safeParseAsync = function (
	this: ArgumentAny,
	data: unknown,
	params?: Partial<ParseParams>,
): Promise<SafeParseReturnType<input<ArgumentAny['_schema']>, output<ArgumentAny['_schema']>>> {
	return ArgumentVector.create(this).safeParseAsync(data, params);
};
