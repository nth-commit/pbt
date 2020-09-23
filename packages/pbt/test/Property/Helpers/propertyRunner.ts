import { pipe, toArray } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as dev from '../../../src/Property';
import * as domainGen from './domainGen';

export const castToInstance = <T>(iteration: dev.GenIteration<T>): dev.GenIteration.Instance<T> => {
  if (iteration.kind !== 'instance') throw 'Fatal: Expected instance';
  return iteration;
};

export const iterate = <Values extends dev.AnyValues>(
  property: dev.Property<Values>,
  { seed, size, iterations }: domainGen.PropertyRunParams,
): Array<dev.PropertyIteration<Values>> => toArray(pipe(property(seed, size), take(iterations)));

export const findFalsification = <Values extends dev.AnyValues>(
  property: dev.Property<Values>,
  runParams: domainGen.PropertyRunParams,
): dev.PropertyIteration.Falsification<Values> => {
  const iterations = iterate(property, runParams);

  const falsification = iterations.find((iteration) => iteration.kind === 'falsification');
  if (!falsification) {
    throw new Error('Fatal: Could not find a falsification');
  }

  return falsification as dev.PropertyIteration.Falsification<Values>;
};
