import { ZodBoolean } from 'zod';
import { NamedArgument } from './NamedArgument';
import { CastError } from '../CastError';

export class BooleanArgument extends NamedArgument<ZodBoolean> {
	protected _cast = (value: string | undefined): boolean | undefined => {
		if (value === undefined) {
			return value;
		}

		if (value === 'true') {
			return true;
		}

		if (value === 'false') {
			return false;
		}

		throw new CastError(`Value "${value}" isn't correct boolean value. Boolean values must be "true" or "false".`);
	};
}
