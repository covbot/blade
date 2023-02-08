import { StringArgument, StringRawCreateParams } from './StringArgument';

export type NamedArgumentBuilderOptions = {
	defaultName: string | undefined;
};

export class NamedArgumentBuilder {
	private readonly _def: NamedArgumentBuilderOptions;

	public constructor(definition: NamedArgumentBuilderOptions) {
		this._def = definition;
	}

	public static create = (defaultName?: string): NamedArgumentBuilder => {
		return new NamedArgumentBuilder({ defaultName });
	};

	public string = (params: StringRawCreateParams = {}) => {
		return StringArgument.create({ ...params, name: this._def.defaultName });
	};
}
