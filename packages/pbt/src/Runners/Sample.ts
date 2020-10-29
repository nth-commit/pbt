import { last, pipe } from 'ix/iterable';
import { filter, take, scan } from 'ix/iterable/operators';
import { Seed, Size } from '../Core';
import { takeWhileInclusive } from '../Core/iterableOperators';
import { Result } from '../Core/Result';
import { Gen, GenIteration } from '../Gen2';
import { GenTree } from '../GenTree';

export type SampleConfig = {
  seed: Seed | number;
  size: Size;
  iterations: number;
};

export namespace SampleResult {
  export type Success<T> = {
    kind: 'success';
    values: T[];
    discards: number;
  };

  export type Error = {
    kind: 'error';
    message: string;
  };
}

export type Sample<T> = { values: T[]; discards: number };

export type SampleResult<T> = Result<Sample<T>, string>;

type SampleAccumulator<T> = {
  trees: GenTree<T>[];
  lastIteration: GenIteration<T>;
};

export const sampleTreesInternal = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleResult<GenTree<T>> => {
  const { seed, size, iterations: iterationCount }: SampleConfig = {
    seed: Seed.spawn(),
    size: 30,
    iterations: 100,
    ...config,
  };

  const sampleAccumulator = last(
    pipe(
      gen.run(seed, size),
      filter(GenIteration.isNotDiscarded),
      scan<GenIteration<T>, SampleAccumulator<T>>({
        seed: {
          trees: [],
          lastIteration: { kind: 'instance' } as GenIteration<T>,
        },
        callback: (acc, iteration) => {
          switch (iteration.kind) {
            case 'instance':
              return {
                trees: [...acc.trees, iteration.tree],
                lastIteration: iteration,
              };
            default:
              return {
                trees: acc.trees,
                lastIteration: iteration,
              };
          }
        },
      }),
      takeWhileInclusive((acc) => acc.lastIteration.kind === 'instance'),
      take(iterationCount),
    ),
  )!;

  switch (sampleAccumulator.lastIteration.kind) {
    case 'instance':
      return Result.ofValue({
        values: sampleAccumulator.trees,
        discards: 0,
      });
    case 'error':
      return Result.ofError(sampleAccumulator.lastIteration.message);
    default:
      throw new Error('Not implemented');
  }
};

export const sampleInternal = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleResult<T> =>
  sampleTreesInternal(gen, config).map<Sample<T>>((sample) => ({
    discards: sample.discards,
    values: sample.values.map((tree) => tree.node.value),
  }));

export const sampleTrees = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): Sample<GenTree<T>> =>
  sampleTreesInternal(gen, config).asOk((message) => new Error(message));

export const sample = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): Sample<T> =>
  sampleInternal(gen, config).asOk((message) => new Error(message));
