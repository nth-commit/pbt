import { last as iterableLast, single as iterableSingle, pipe, toArray } from 'ix/iterable';
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
): Array<dev.PropertyResult<Values>> => toArray(pipe(property(seed, size), take(iterations)));

export const last = <Values extends dev.AnyValues>(
  property: dev.Property<Values>,
  { seed, size, iterations }: domainGen.PropertyRunParams,
): dev.PropertyResult<Values> => iterableLast(pipe(property(seed, size), take(iterations)))!;

export const single = <Values extends dev.AnyValues>(
  property: dev.Property<Values>,
  { seed, size, iterations }: domainGen.PropertyRunParams,
): dev.PropertyResult<Values> => iterableSingle(pipe(property(seed, size), take(iterations)))!;

export const firstFalsification = <Values extends dev.AnyValues>(
  property: dev.Property<Values>,
  runParams: domainGen.PropertyRunParams,
): dev.PropertyResult.Falsified<Values> => {
  const iterations = iterate(property, runParams);

  const falsification = iterations.find((iteration) => iteration.kind === 'falsified');
  if (!falsification) {
    throw new Error('Fatal: Could not find a falsification');
  }

  return falsification as dev.PropertyResult.Falsified<Values>;
};
