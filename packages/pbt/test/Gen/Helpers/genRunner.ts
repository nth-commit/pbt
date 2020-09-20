import { pipe, toArray } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as dev from '../../../src/Gen';
import * as domainGen from './domainGen';

export const castToInstance = <T>(iteration: dev.GenIteration<T>): dev.GenIteration.Instance<T> => {
  if (iteration.kind !== 'instance') throw 'Fatal: Expected instance';
  return iteration;
};

export const runGen = <T>(
  gen: dev.Gen<T>,
  { seed, size, iterations }: domainGen.GenRunParams,
): Array<dev.GenIteration<T>> => toArray(pipe(gen(seed, size), take(iterations)));

export const runSucceedingGen = <T>(gen: dev.Gen<T>, runParams: domainGen.GenRunParams): T[] =>
  runGen(gen, runParams)
    .map(castToInstance)
    .map((instance) => instance.tree[0]);
