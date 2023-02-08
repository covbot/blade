import { RawCreateParams, ZodString } from 'zod';
import { NamedArgument } from './NamedArgument';
import { argumentUtils } from '../argumentUtils';

export type StringRawCreateParams = RawCreateParams & { coerce?: true | undefined };

export class StringArgument extends NamedArgument<ZodString> {
	public _cast(value: string | undefined) {
		return value || '';
	}

	public static create = (params?: StringRawCreateParams & { name?: string }): StringArgument => {
		return new StringArgument(ZodString.create(params), { defaultName: params?.name, aliases: [] });
	};

	public email = argumentUtils.wrap(this._schema.email.bind(this._schema), this._clone.bind(this));
	public url = argumentUtils.wrap(this._schema.url.bind(this._schema), this._clone.bind(this));
	public uuid = argumentUtils.wrap(this._schema.uuid.bind(this._schema), this._clone.bind(this));
	public cuid = argumentUtils.wrap(this._schema.cuid.bind(this._schema), this._clone.bind(this));
	public datetime = argumentUtils.wrap(this._schema.datetime.bind(this._schema), this._clone.bind(this));
	public regex = argumentUtils.wrap(this._schema.regex.bind(this._schema), this._clone.bind(this));
	public startsWith = argumentUtils.wrap(this._schema.startsWith.bind(this._schema), this._clone.bind(this));
	public endsWith = argumentUtils.wrap(this._schema.endsWith.bind(this._schema), this._clone.bind(this));
	public min = argumentUtils.wrap(this._schema.min.bind(this._schema), this._clone.bind(this));
	public max = argumentUtils.wrap(this._schema.max.bind(this._schema), this._clone.bind(this));
	public length = argumentUtils.wrap(this._schema.length.bind(this._schema), this._clone.bind(this));
	public nonempty = argumentUtils.wrap(this._schema.nonempty.bind(this._schema), this._clone.bind(this));
	public trim = argumentUtils.wrap(this._schema.trim.bind(this._schema), this._clone.bind(this));
}
