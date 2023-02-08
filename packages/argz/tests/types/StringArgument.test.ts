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
});
