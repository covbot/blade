import { ZodTypeAny } from 'zod';

export abstract class Argument<TSchema extends ZodTypeAny = ZodTypeAny, TDefinition = {}> {
	public readonly _schema: TSchema;
	protected readonly _definition: TDefinition;

	public constructor(schema: TSchema, definition: TDefinition) {
		this._schema = schema;
		this._definition = definition;
	}

	protected _clone(schema?: TSchema, definition?: TDefinition): this {
		schema ??= this._schema;
		definition ??= this._definition;

		// eslint-disable-next-line @typescript-eslint/naming-convention
		const This = Object.getPrototypeOf(this);

		return new This(schema, definition);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	public _getSchema(_rawArgumentName: string): TSchema {
		return this._schema;
	}

	public describe(description: string): this {
		const schema = this._schema.describe(description);

		return this._clone(schema);
	}
}
