import { describe, it, expect } from '@jest/globals';
import { ParseInput, z } from 'zod';
import { ArgumentVector } from '../../src/types/ArgumentVector';
import { BypassedArrayArgument } from '../../src/types/BypassedArrayArgument';
import { ObjectArgument } from '../../src/types/ObjectArgument';
import { PositionalArrayArgument } from '../../src/types/PositionalArrayArgument';
import { StringArgument } from '../../src/types/StringArgument';

const createMockZodInput = (data: string[]): ParseInput => ({
	data,
	parent: {
		common: {
			async: false,
			issues: [],
		},
		data,
		parent: null,
		parsedType: 'array',
		path: [],
	},
	path: [],
});

describe('ArgumentVector', () => {
	it('must cast simple arguments', () => {
		const argz = ArgumentVector.create(StringArgument.create({ name: 'hello' }));

		expect(argz._cast(createMockZodInput(['--hello', 'world']))).toStrictEqual({
			status: 'valid',
			value: 'world',
		});

		expect(argz._cast(createMockZodInput(['--hello=world']))).toStrictEqual({
			status: 'valid',
			value: 'world',
		});
	});

	it('must cast object arguments', () => {
		const argz = ArgumentVector.create(
			ObjectArgument.create({
				hello: ObjectArgument.create({
					bye: StringArgument.create(),
				}),
			}),
		);

		expect(argz._cast(createMockZodInput(['--hello.bye', 'world']))).toStrictEqual({
			status: 'valid',
			value: {
				hello: {
					bye: 'world',
				},
			},
		});

		expect(argz._cast(createMockZodInput(['--hello.bye=world']))).toStrictEqual({
			status: 'valid',
			value: {
				hello: {
					bye: 'world',
				},
			},
		});

		expect(argz._cast(createMockZodInput(['--hello', '{ "bye": "world" }']))).toStrictEqual({
			status: 'valid',
			value: {
				hello: {
					bye: 'world',
				},
			},
		});

		expect(argz._cast(createMockZodInput(['--hello={ "bye": "world" }']))).toStrictEqual({
			status: 'valid',
			value: {
				hello: {
					bye: 'world',
				},
			},
		});
	});

	it('must return collect positional arguments', () => {
		const schema = ArgumentVector.create(PositionalArrayArgument.create(z.string()));

		expect(schema._cast(createMockZodInput(['hello', 'world']))).toStrictEqual({
			status: 'valid',
			value: ['hello', 'world'],
		});
	});

	it('must correctly find positional arguments', () => {
		const schema = ArgumentVector.create(
			ObjectArgument.create({
				test: StringArgument.create(),
				other: PositionalArrayArgument.create(z.string()),
			}),
		);

		expect(schema._cast(createMockZodInput(['value', 'other']))).toStrictEqual({
			status: 'valid',
			value: {
				other: ['value', 'other'],
			},
		});

		expect(schema._cast(createMockZodInput(['--test', 'value', 'hello']))).toStrictEqual({
			status: 'valid',
			value: {
				test: 'value',
				other: ['hello'],
			},
		});
	});

	it('must correctly get bypassed arguments', () => {
		const schema = ArgumentVector.create(BypassedArrayArgument.create(z.string()));

		expect(schema._cast(createMockZodInput(['--', '--hello', 'world', 'test', '-al']))).toStrictEqual({
			status: 'valid',
			value: ['--hello', 'world', 'test', '-al'],
		});
	});

	it('must correctly find bypassed arguments', () => {
		const schema = ArgumentVector.create(
			ObjectArgument.create({
				value: StringArgument.create(),
				anotherValue: BypassedArrayArgument.create(z.string()),
			}),
		);

		expect(schema._cast(createMockZodInput(['--value=a', '--', '--this', 'is', 'bypassed']))).toStrictEqual({
			status: 'valid',
			value: {
				value: 'a',
				anotherValue: ['--this', 'is', 'bypassed'],
			},
		});
	});
});
