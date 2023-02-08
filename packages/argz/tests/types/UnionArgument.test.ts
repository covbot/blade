import { describe, it, expect } from '@jest/globals';
import { z, ZodError } from 'zod';
import {
	ArgumentVector,
	BypassedArrayArgument,
	ObjectArgument,
	PositionalArrayArgument,
	StringArgument,
	UnionArgument,
} from '../../src/api';
describe('UnionArgument', () => {
	it('must work with positional arguments', () => {
		const schema = ArgumentVector.create(
			UnionArgument.create([
				PositionalArrayArgument.create(z.literal('hello')),
				PositionalArrayArgument.create(z.literal('bye')),
			]),
		);

		expect(schema.safeParse(['hello', 'hello', 'hello'])).toStrictEqual({
			success: true,
			data: ['hello', 'hello', 'hello'],
		});

		expect(schema.safeParse(['hello', 'bye', 'hello'])).toStrictEqual({
			success: false,
			error: expect.any(ZodError),
		});
	});

	it('must work with bypassed arguments', () => {
		const schema = ArgumentVector.create(
			UnionArgument.create([
				BypassedArrayArgument.create(z.literal('hello')),
				BypassedArrayArgument.create(z.literal('bye')),
			]),
		);

		expect(schema.safeParse(['--', 'hello', 'hello', 'hello'])).toStrictEqual({
			success: true,
			data: ['hello', 'hello', 'hello'],
		});

		expect(schema.safeParse(['--', 'hello', 'bye', 'hello'])).toStrictEqual({
			success: false,
			error: expect.any(ZodError),
		});
	});

	it('must throw if arguments are not compatible', () => {
		expect(() =>
			UnionArgument.create([
				PositionalArrayArgument.create(z.string()),
				BypassedArrayArgument.create(z.string()),
			]),
		).toThrow();

		expect(() =>
			UnionArgument.create([PositionalArrayArgument.create(z.string()), StringArgument.create()]),
		).toThrow();

		expect(() =>
			UnionArgument.create([PositionalArrayArgument.create(z.string()), StringArgument.create()]),
		).toThrow();

		expect(() =>
			UnionArgument.create([PositionalArrayArgument.create(z.string()), ObjectArgument.create({})]),
		).toThrow();

		expect(() =>
			UnionArgument.create([ObjectArgument.create({}), PositionalArrayArgument.create(z.string())]),
		).toThrow();

		expect(() => UnionArgument.create([ObjectArgument.create({}), StringArgument.create()])).not.toThrow();
	});

	it('must correctly parse union types', () => {
		const schema = ArgumentVector.create(
			ObjectArgument.create({
				value: UnionArgument.create([
					StringArgument.create().email(),
					StringArgument.create().endsWith('pass'),
				]),
			}),
		);

		expect(schema.safeParse(['--value', 'a@a.com'])).toStrictEqual({
			success: true,
			data: {
				value: 'a@a.com',
			},
		});

		expect(schema.safeParse(['--value', 'test-pass'])).toStrictEqual({
			success: true,
			data: {
				value: 'test-pass',
			},
		});

		expect(schema.safeParse(['--value', 'random string'])).toStrictEqual({
			success: false,
			error: expect.any(ZodError),
		});
	});

	it('must correctly parse union types, with mixed types', () => {
		const schema = ArgumentVector.create(
			ObjectArgument.create({
				value: UnionArgument.create([
					StringArgument.create().email(),
					ObjectArgument.create({
						nested: StringArgument.create(),
					}),
				]),
			}),
		);

		expect(schema.safeParse(['--value', 'a@a.com'])).toStrictEqual({
			success: true,
			data: {
				value: 'a@a.com',
			},
		});

		expect(schema.safeParse(['--value.nested', 'test-pass'])).toStrictEqual({
			success: true,
			data: {
				value: {
					nested: 'test-pass',
				},
			},
		});
	});

	it('must search for nested argument', () => {
		const schema = ArgumentVector.create(
			UnionArgument.create([
				ObjectArgument.create({
					another: StringArgument.create(),
				}),
				ObjectArgument.create({
					nested: StringArgument.create().email(),
				}),
			]),
		);

		expect(schema.safeParse(['--nested', 'a@a.com'])).toStrictEqual({
			success: true,
			data: {
				nested: 'a@a.com',
			},
		});

		expect(schema.safeParse(['--another', 'test-pass'])).toStrictEqual({
			success: true,
			data: {
				another: 'test-pass',
			},
		});
	});

	/**
	 * FIXME:
	 * In current implementation, parser takes the first argument, that could be casted.
	 * However, in this case, parser should take not first, but second matching option.
	 */
	it.skip('must correctly pick types, not the first one which could be casted', () => {
		const schema = ArgumentVector.create(
			ObjectArgument.create({
				value: UnionArgument.create([
					StringArgument.create().email(),
					ObjectArgument.create({
						nested: StringArgument.create(),
					}),
				]),
			}),
		);

		expect(schema.safeParse(['--value', '{ "nested": "value" }'])).toStrictEqual({
			success: true,
			data: {
				value: {
					nested: 'value',
				},
			},
		});
	});
});
