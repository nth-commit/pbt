import { Seed, Size } from './Imports';
import { AnyValues, PropertyIteration } from './PropertyIteration';

export type Property<Values extends AnyValues> = (seed: Seed, size: Size) => Iterable<PropertyIteration<Values>>;
