import { last, pipe, toArray } from 'ix/iterable';
import { filter, map, take, scan } from 'ix/iterable/operators';
import { Seed, Size } from '../Core';
import { takeWhileInclusive } from '../Core/iterableOperators';
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

export type SampleResult<T> = SampleResult.Success<T> | SampleResult.Error;

export namespace SampleTreeResult {
  export type Success<T> = {
    kind: 'success';
    trees: GenTree<T>[];
    discards: number;
  };

  export type Error = SampleResult.Error;
}

export type SampleTreeResult<T> = SampleTreeResult.Success<T> | SampleTreeResult.Error;

type SampleAccumulator<T> = {
  trees: GenTree<T>[];
  lastIteration: GenIteration<T>;
};

export const sampleTrees = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleTreeResult<T> => {
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
      return {
        kind: 'success',
        trees: sampleAccumulator.trees,
        discards: 0,
      };
    case 'error':
      return {
        kind: 'error',
        message: sampleAccumulator.lastIteration.message,
      };
    default:
      throw new Error('Whoopsies');
  }
};

export const sample = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleResult<T> => {
  const sampleTreeResult = sampleTrees(gen, config);
  switch (sampleTreeResult.kind) {
    case 'success':
      return {
        kind: 'success',
        values: sampleTreeResult.trees.map((tree) => tree.node.value),
        discards: sampleTreeResult.discards,
      };
    default:
      return sampleTreeResult;
  }
};
