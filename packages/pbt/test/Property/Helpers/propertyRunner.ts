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

// export const iterateAsInstances = <T>(
//   gen: dev.Gen<T>,
//   runParams: domainGen.GenRunParams,
// ): dev.GenIteration.Instance<T>[] => iterate(gen, runParams).map(castToInstance);

// export const iterateAsTrees = <T>(gen: dev.Gen<T>, runParams: domainGen.GenRunParams): devCore.Tree<T>[] =>
//   iterateAsInstances(gen, runParams).map((instance) => instance.tree);

// export const iterateAsOutcomes = <T>(gen: dev.Gen<T>, runParams: domainGen.GenRunParams): T[] =>
//   iterateAsTrees(gen, runParams).map(devCore.Tree.outcome);

// export const iterateInstances = <T>(
//   gen: dev.Gen<T>,
//   runParams: domainGen.GenRunParams,
// ): dev.GenIteration.Instance<T>[] => iterate(gen, runParams).filter(GenIteration.isInstance);

// export const iterateTrees = <T>(gen: dev.Gen<T>, runParams: domainGen.GenRunParams): devCore.Tree<T>[] =>
//   iterateInstances(gen, runParams).map((instance) => instance.tree);

// export const iterateOutcomes = <T>(gen: dev.Gen<T>, runParams: domainGen.GenRunParams): T[] =>
//   iterateTrees(gen, runParams).map(devCore.Tree.outcome);
