import { describe, it, expect } from '@jest/globals';
import { argz } from '../src/api';

describe('api', () => {
	it('should support simple schema creation', () => {
		expect(argz.argv(argz.named('hello').string()).safeParse(['--hello=world'])).toStrictEqual({
			success: true,
			data: 'world',
		});
	});
});
