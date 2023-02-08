import { describe, it, expect } from '@jest/globals';
import { ZodError, ZodIssueCode } from 'zod';
import { ArgumentVector, StringArgument } from '../../src/api';

describe('Argument', () => {
	describe('describe', () => {
		it('must set description of a zod schema', () => {
			const argument = StringArgument.create().describe('Some description!');
			expect(argument._schema.description).toBe('Some description!');
		});
	});

	describe('default', () => {
		it('must set default value', () => {
			const argument = StringArgument.create().default('Value!');
			expect(ArgumentVector.create(argument).safeParse([])).toStrictEqual({
				success: true,
				data: 'Value!',
			});
		});

		it('must remove default value', () => {
			const argument = StringArgument.create({ name: 'hello' }).default('Value!').removeDefault();
			expect(ArgumentVector.create(argument).safeParse([])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});
	});

	describe('catch', () => {
		it('must set catch', () => {
			const argument = StringArgument.create({ name: 'hello' }).max(6).catch("That's fallback value");
			expect(ArgumentVector.create(argument).safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(ArgumentVector.create(argument).safeParse(['--hello', "That's too long argument"])).toStrictEqual({
				success: true,
				data: "That's fallback value",
			});
		});

		it('must remove catch', () => {
			const argument = StringArgument.create({ name: 'hello' })
				.max(6)
				.catch("That's fallback value")
				.removeCatch();
			expect(ArgumentVector.create(argument).safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(ArgumentVector.create(argument).safeParse(['--hello', "That's too long argument"])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});
	});

	describe('brand', () => {
		// These are just tests of api types. There is no logic in here - if typescript compiles test, it means this test is passed.

		it('must set brand', () => {
			StringArgument.create({ name: 'username' }).min(3).brand('username');
		});

		it('must remove brand', () => {
			const argument = StringArgument.create({ name: 'username' }).min(3).brand('username').unwrap();

			let value = ArgumentVector.create(argument).parse(['--username', 'sirse']);

			// Validate that brand is removed.
			value = '';

			expect(value).toBe('');
		});
	});

	describe('optional', () => {
		it('must make value optional', () => {
			const argument = StringArgument.create({ name: 'hello' }).optional();
			const schema = ArgumentVector.create(argument);
			expect(schema.safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(schema.safeParse(['--hello'])).toStrictEqual({
				success: true,
				data: undefined,
			});

			expect(schema.safeParse([])).toStrictEqual({
				success: true,
				data: undefined,
			});
		});

		it('must remove optional', () => {
			const argument = StringArgument.create({ name: 'hello' }).optional().unwrap();
			const schema = ArgumentVector.create(argument);
			expect(schema.safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(schema.safeParse(['--hello'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});

			expect(schema.safeParse([])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});
	});

	describe('nullable', () => {
		it('must make value optional', () => {
			const schema = ArgumentVector.create(StringArgument.create({ name: 'hello' }).nullable());
			expect(schema.safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(schema.safeParse(['--hello', 'null'])).toStrictEqual({
				success: true,
				data: null,
			});

			expect(schema.safeParse([])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});

		it('must remove optional', () => {
			const schema = ArgumentVector.create(StringArgument.create({ name: 'hello' }).nullable().unwrap());
			expect(schema.safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(schema.safeParse(['--hello', 'null'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});
	});

	describe('nullish', () => {
		it('must make value optional and nullable', () => {
			const schema = ArgumentVector.create(StringArgument.create({ name: 'hello' }).nullish());
			expect(schema.safeParse(['--hello', 'world'])).toStrictEqual({
				success: true,
				data: 'world',
			});

			expect(schema.safeParse(['--hello', 'null'])).toStrictEqual({
				success: true,
				data: null,
			});

			expect(schema.safeParse(['--hello', 'undefined'])).toStrictEqual({
				success: true,
				data: undefined,
			});
		});
	});

	describe('superRefine', () => {
		it('must do superRefine', () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).superRefine((output): output is `${number}-1` =>
					/\d+-1/.test(output),
				),
			);

			expect(schema.safeParse(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(schema.safeParse(['--hello', 'asdf'])).toStrictEqual({
				success: true,
				data: 'asdf',
			});
		});

		it('must pass correct context into superRefine', () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).superRefine((output, context): void => {
					if (!/\d+-1/.test(output)) {
						context.addIssue({
							code: ZodIssueCode.custom,
						});
					}
				}),
			);

			expect(schema.safeParse(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(schema.safeParse(['--hello', 'asdf'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});
	});

	describe('refinement', () => {
		it('must do refinement', () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).refinement(
					(output): output is `${number}-1` => /\d+-1/.test(output),
					{
						code: ZodIssueCode.custom,
						path: [],
						message: 'Something went wrong',
					},
				),
			);

			expect(schema.safeParse(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(schema.safeParse(['--hello', 'asdf'])).toStrictEqual({
				success: false,
				error: new ZodError([
					{
						code: ZodIssueCode.custom,
						path: [],
						message: 'Something went wrong',
					},
				]),
			});
		});

		it('must work with function as refinement data', () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).refinement(
					(output): output is `${number}-1` => /\d+-1/.test(output),
					(output) => ({
						code: ZodIssueCode.custom,
						path: [],
						message: `Value ${output} is wrong`,
					}),
				),
			);

			expect(schema.safeParse(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(schema.safeParse(['--hello', 'asdf'])).toStrictEqual({
				success: false,
				error: new ZodError([
					{
						code: ZodIssueCode.custom,
						path: [],
						message: 'Value asdf is wrong',
					},
				]),
			});
		});
	});

	describe('refine', () => {
		it('must do refine', () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).refine((output): output is `${number}-1` =>
					/\d+-1/.test(output),
				),
			);

			expect(schema.safeParse(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(schema.safeParse(['--hello', 'asdf'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});

		it('must pass message into refine', () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).refine(
					(output): output is `${number}-1` => /\d+-1/.test(output),
					{
						message: 'Hello, world!',
					},
				),
			);

			expect(schema.safeParse(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(schema.safeParse(['--hello', 'asdf'])).toStrictEqual({
				success: false,
				error: new ZodError([
					{
						code: 'custom',
						message: 'Hello, world!',
						path: [],
					},
				]),
			});
		});

		it('must work with async refinement', async () => {
			const schema = ArgumentVector.create(
				StringArgument.create({ name: 'hello' }).refine((output) => Promise.resolve(/\d+-1/.test(output)), {
					message: 'Hello, world!',
				}),
			);

			expect(await schema.safeParseAsync(['--hello', '123-1'])).toStrictEqual({
				success: true,
				data: '123-1',
			});

			expect(await schema.safeParseAsync(['--hello', 'asdf'])).toStrictEqual({
				success: false,
				error: new ZodError([
					{
						code: 'custom',
						message: 'Hello, world!',
						path: [],
					},
				]),
			});
		});
	});
});
