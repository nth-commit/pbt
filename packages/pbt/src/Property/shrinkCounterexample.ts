/* istanbul ignore file */
import { empty } from 'ix/iterable';
import { Tree } from './Imports';
import { PropertyFunction } from './PropertyFunction';
import { PropertyIteration, AnyValues } from './PropertyIteration';

type Trees<Values extends AnyValues> = { [P in keyof Values]: Tree<Values[P]> };

export const shrinkCounterexample = <Values extends AnyValues>(
  counterexample: Trees<Values>,
  f: PropertyFunction<Values>,
): Iterable<PropertyIteration<Values>> => {
  return empty();
};
