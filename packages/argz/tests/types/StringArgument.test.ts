import { describe, it, expect } from '@jest/globals';
import { ZodError } from 'zod';
import { ArgumentVector } from '../../src/types/ArgumentVector';
import { StringArgument } from '../../src/types/StringArgument';

describe('StringArgument', () => {
	it('must wrap default zod methods', () => {
		const validate = (arg: StringArgument, data: string[]) => ArgumentVector.create(arg).safeParse(data);

		expect(validate(StringArgument.create({ name: 'hello' }).min(3), ['--hello', 'wo'])).toStrictEqual({
			success: false,
			error: expect.any(ZodError),
		});

		expect(validate(StringArgument.create({ name: 'hello' }).min(3), ['--hello', 'worl'])).toStrictEqual({
			success: true,
			data: 'worl',
		});

		expect(validate(StringArgument.create({ name: 'hello' }).email(), ['--hello', 'a@a'])).toStrictEqual({
			success: false,
			error: expect.any(ZodError),
		});

		expect(validate(StringArgument.create({ name: 'hello' }).email(), ['--hello', 'a@a.com'])).toStrictEqual({
			success: true,
			data: 'a@a.com',
		});
	});

	it('must treat "null" and "undefined" as special values', () => {
		const argument = StringArgument.create({ name: 'hello' }).nullish();
		expect(ArgumentVector.create(argument).safeParse(['--hello', 'null'])).toStrictEqual({
			success: true,
			data: null,
		});

		expect(ArgumentVector.create(argument).safeParse(['--hello', 'undefined'])).toStrictEqual({
			success: true,
			data: undefined,
		});

		expect(ArgumentVector.create(argument).safeParse(['--hello', 'undefinedd'])).toStrictEqual({
			success: true,
			data: 'undefinedd',
		});
	});

	it('must treat "null" and "undefined" as string literals, if coerce property is truthy', () => {
		const argument = StringArgument.create({ name: 'hello', coerce: true }).nullish();
		expect(ArgumentVector.create(argument).safeParse(['--hello', 'null'])).toStrictEqual({
			success: true,
			data: 'null',
		});

		expect(ArgumentVector.create(argument).safeParse(['--hello', 'undefined'])).toStrictEqual({
			success: true,
			data: 'undefined',
		});
	});
});
