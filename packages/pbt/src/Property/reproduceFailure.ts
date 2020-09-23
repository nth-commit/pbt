import { Gen, Seed, Size } from './Imports';
import { AnyValues, PropertyIteration } from './PropertyIteration';
import { PropertyFunction } from './PropertyFunction';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

/* istanbul ignore next */
export const reproduceFailure = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  seed: Seed,
  size: Size,
): PropertyIteration<Values> => {
  return null as any;
};
