import { RawCreateParams, ZodString } from 'zod';
import { NamedArgument } from './NamedArgument';
import { argumentUtils } from '../argumentUtils';

export type StringRawCreateParams = RawCreateParams & { coerce?: true | undefined };

export class StringArgument extends NamedArgument<ZodString> {
	public _cast = (value: string | undefined) => {
		return value || '';
	};

	public static create = (params?: StringRawCreateParams & { name?: string }): StringArgument => {
		return new StringArgument(ZodString.create(params), { defaultName: params?.name, aliases: [] });
	};

	public email = argumentUtils.wrap(this._schema.email.bind(this._schema), this._clone);
	public url = argumentUtils.wrap(this._schema.url.bind(this._schema), this._clone);
	public uuid = argumentUtils.wrap(this._schema.uuid.bind(this._schema), this._clone);
	public cuid = argumentUtils.wrap(this._schema.cuid.bind(this._schema), this._clone);
	public datetime = argumentUtils.wrap(this._schema.datetime.bind(this._schema), this._clone);
	public regex = argumentUtils.wrap(this._schema.regex.bind(this._schema), this._clone);
	public startsWith = argumentUtils.wrap(this._schema.startsWith.bind(this._schema), this._clone);
	public endsWith = argumentUtils.wrap(this._schema.endsWith.bind(this._schema), this._clone);
	public min = argumentUtils.wrap(this._schema.min.bind(this._schema), this._clone);
	public max = argumentUtils.wrap(this._schema.max.bind(this._schema), this._clone);
	public length = argumentUtils.wrap(this._schema.length.bind(this._schema), this._clone);
	public nonempty = argumentUtils.wrap(this._schema.nonempty.bind(this._schema), this._clone);
	public trim = argumentUtils.wrap(this._schema.trim.bind(this._schema), this._clone);
}
