import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { ArgumentVector } from '../../src/types/ArgumentVector';
import { StringArgument } from '../../src/types/StringArgument';

describe('Argument', () => {
	describe('describe', () => {
		it('should set description of a zod schema', () => {
			const argument = StringArgument.create().describe('Some description!');
			expect(argument._schema.description).toBe('Some description!');
		});
	});

	describe('default', () => {
		it('should set default value', () => {
			const argument = StringArgument.create().default('Value!');
			expect(ArgumentVector.create(argument).safeParse([])).toStrictEqual({
				success: true,
				data: 'Value!',
			});
		});

		it('should remove default value', () => {
			const argument = StringArgument.create({ name: 'hello' }).default('Value!').removeDefault();
			expect(ArgumentVector.create(argument).safeParse([])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});
	});

	describe('catch', () => {
		it('should set catch', () => {
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

		it('should remove catch', () => {
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

		it('should set brand', () => {
			StringArgument.create({ name: 'username' }).min(3).brand('username');
		});

		it('should remove brand', () => {
			const argument = StringArgument.create({ name: 'username' }).min(3).brand('username').unwrap();

			let value = ArgumentVector.create(argument).parse(['--username', 'sirse']);

			// Validate that brand is removed.
			value = '';

			expect(value).toBe('');
		});
	});

	describe('optional', () => {
		it('should make value optional', () => {
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

		it('should remove optional', () => {
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
		it('should make value optional', () => {
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

		it('should remove optional', () => {
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
		it('should make value optional and nullable', () => {
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
});
