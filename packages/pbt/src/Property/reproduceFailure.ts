import { Gen, Seed, Size } from './Imports';
import { AnyValues, PropertyIteration } from './PropertyIteration';
import { PropertyFunction } from './ThrowablePredicate';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

export const reproduceFailure = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  seed: Seed,
  size: Size,
): PropertyIteration<Values> => {
  return null as any;
};
