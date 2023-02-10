import { RawCreateParams, ZodUndefined } from 'zod';
import { NamedArgument } from './NamedArgument';

export class UndefinedArgument extends NamedArgument<ZodUndefined> {
	protected _cast(): unknown {
		return undefined;
	}

	public static create = (params?: RawCreateParams): UndefinedArgument => {
		return new UndefinedArgument(ZodUndefined.create(params), { aliases: [] });
	};
}
