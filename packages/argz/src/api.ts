import { ArgumentVector } from './types/ArgumentVector';
import { NamedArgumentBuilder } from './types/NamedArgumentBuilder';

export { Argument } from './types/Argument';
export { ArgumentVector } from './types/ArgumentVector';
export { BooleanArgument } from './types/BooleanArgument';
export { BrandedArgument } from './types/BrandedArgument';
export { BypassedArgument } from './types/BypassedArgument';
export { BypassedArrayArgument } from './types/BypassedArrayArgument';
export { CastableArgument } from './types/CastableArgument';
export { CatchArgument } from './types/CatchArgument';
export { DefaultArgument } from './types/DefaultArgument';
export { EffectsArgument } from './types/EffectsArgument';
export { GroupedArgument } from './types/GroupedArgument';
export { NamedArgument } from './types/NamedArgument';
export { NamedArgumentBuilder } from './types/NamedArgumentBuilder';
export { NeverArgument } from './types/NeverArgument';
export { NullableArgument } from './types/NullableArgument';
export { ObjectArgument } from './types/ObjectArgument';
export { OptionalArgument } from './types/OptionalArgument';
export { PositionalArgument } from './types/PositionalArgument';
export { PositionalArrayArgument } from './types/PositionalArrayArgument';
export { StringArgument } from './types/StringArgument';
export { UnionArgument } from './types/UnionArgument';

export namespace argz {
	export const argv = ArgumentVector.create;
	export const named = NamedArgumentBuilder.create;
}
