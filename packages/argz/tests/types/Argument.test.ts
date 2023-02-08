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
});
