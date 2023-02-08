import { ArgumentVector } from './types/ArgumentVector';
import { NamedArgumentBuilder } from './types/NamedArgumentBuilder';

export namespace argz {
	export const argv = ArgumentVector.create;
	export const named = NamedArgumentBuilder.create;
}
