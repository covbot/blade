import { RawCreateParams, ZodString } from 'zod';
import { argumentUtils } from '../argumentUtils';
import { NamedArgument } from './NamedArgument';

export type StringRawCreateParams = RawCreateParams & { coerce?: true | undefined };

export class StringArgument extends NamedArgument<ZodString> {
	public _cast(value: string | undefined) {
		return value || '';
	}

	public static create = (params?: StringRawCreateParams & { name?: string }): StringArgument => {
		return new StringArgument(ZodString.create(params), { defaultName: params?.name, aliases: [] });
	};

	public email = argumentUtils.wrap(this._schema.email, this._clone);
	public url = argumentUtils.wrap(this._schema.url, this._clone);
	public uuid = argumentUtils.wrap(this._schema.uuid, this._clone);
	public cuid = argumentUtils.wrap(this._schema.cuid, this._clone);
	public datetime = argumentUtils.wrap(this._schema.datetime, this._clone);
	public regex = argumentUtils.wrap(this._schema.regex, this._clone);
	public startsWith = argumentUtils.wrap(this._schema.startsWith, this._clone);
	public endsWith = argumentUtils.wrap(this._schema.endsWith, this._clone);
	public min = argumentUtils.wrap(this._schema.min, this._clone);
	public max = argumentUtils.wrap(this._schema.max, this._clone);
	public length = argumentUtils.wrap(this._schema.length, this._clone);
	public nonempty = argumentUtils.wrap(this._schema.nonempty, this._clone);
	public trim = argumentUtils.wrap(this._schema.trim, this._clone);
}
