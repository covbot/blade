import { describe, expect, it } from '@jest/globals';
import { ZodError } from 'zod';
import { ArgumentVector, ObjectArgument, StringArgument } from '../../src/api';

describe('ObjectArgument', () => {
	describe('parsing', () => {
		it('must parse unnamed object', () => {
			const schema = ArgumentVector.create(
				ObjectArgument.create({
					first: StringArgument.create(),
					second: StringArgument.create().email(),
				}),
			);

			expect(schema.safeParse(['--first', 'value', '--second=a@a.com'])).toStrictEqual({
				success: true,
				data: {
					first: 'value',
					second: 'a@a.com',
				},
			});

			expect(schema.safeParse(['--first', 'value', '--second', 'not email'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});

		it('must parse named object', () => {
			const schema = ArgumentVector.create(
				ObjectArgument.create(
					{
						first: StringArgument.create(),
						second: StringArgument.create().email(),
					},
					{ name: 'config' },
				),
			);

			expect(schema.safeParse(['--config.first', 'value', '--config.second=a@a.com'])).toStrictEqual({
				success: true,
				data: {
					first: 'value',
					second: 'a@a.com',
				},
			});

			expect(schema.safeParse(['--config.first', 'value', '--config.second', 'not email'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});

			expect(schema.safeParse(['--config', '{ "first": "value", "second": "a@a.com" }'])).toStrictEqual({
				success: true,
				data: {
					first: 'value',
					second: 'a@a.com',
				},
			});
		});

		it('must working with nesting', () => {
			const schema = ArgumentVector.create(
				ObjectArgument.create(
					{
						first: ObjectArgument.create({
							value: StringArgument.create(),
						}),
						second: StringArgument.create().email(),
					},
					{ name: 'config' },
				),
			);

			expect(schema.safeParse(['--config.first.value', 'value', '--config.second=a@a.com'])).toStrictEqual({
				success: true,
				data: {
					first: {
						value: 'value',
					},
					second: 'a@a.com',
				},
			});

			expect(schema.safeParse(['--config.first', 'value', '--config.second', 'not email'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});

			expect(
				schema.safeParse(['--config', '{ "first": { "value": "value" }, "second": "a@a.com" }']),
			).toStrictEqual({
				success: true,
				data: {
					first: { value: 'value' },
					second: 'a@a.com',
				},
			});
		});
	});

	describe('completeness (all features of zod)', () => {
		it('must return shape', () => {
			const schema = ObjectArgument.create({
				value: StringArgument.create(),
			});

			expect(Object.keys(schema.shape)).toStrictEqual(['value']);
			expect(schema.shape.value).toBeInstanceOf(StringArgument);
		});

		it('must fail on unknown keys, when strict', () => {
			const schema = ArgumentVector.create(
				ObjectArgument.create({
					value: StringArgument.create(),
				}).strict(),
			);

			expect(schema.safeParse(['--value', 'a', '--hello', 'b'])).toStrictEqual({
				success: false,
				error: expect.any(ZodError),
			});
		});

		it('must skip unknown keys, when strip', () => {
			const schema = ArgumentVector.create(
				ObjectArgument.create({
					value: StringArgument.create(),
				}).strip(),
			);

			expect(schema.safeParse(['--value', 'a', '--hello', 'b'])).toStrictEqual({
				success: true,
				data: {
					value: 'a',
				},
			});
		});

		it('must ignore unknown keys, when passthrough', () => {
			const schema = ArgumentVector.create(
				ObjectArgument.create({
					value: StringArgument.create(),
				}).passthrough(),
			);

			expect(schema.safeParse(['--value', 'a', '--hello', 'b'])).toStrictEqual({
				success: true,
				data: {
					value: 'a',
					hello: 'b',
				},
			});
		});
	});
});
