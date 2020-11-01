import { last, pipe } from 'ix/iterable';
import { scan } from 'ix/iterable/operators';
import { Seed, Size } from '../Core';
import { takeWhileInclusive } from '../Core/iterableOperators';
import { Result } from '../Core/Result';
import { Gen, GenIteration } from '../Gen2';
import { GenTree } from '../GenTree';
import { Exhaustible, ExhaustionStrategy } from './ExhaustionStrategy';

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
  lastIteration: Exhaustible<GenIteration<T>>;
  instanceCount: number;
  discardCount: number;
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
      ExhaustionStrategy.apply(ExhaustionStrategy.defaultStrategy(), (iteration) => iteration.kind === 'discard'),
      scan<Exhaustible<GenIteration<T>>, SampleAccumulator<T>>({
        seed: {
          trees: [],
          instanceCount: 0,
          discardCount: 0,
          lastIteration: { kind: 'instance' } as GenIteration<T>,
        },
        callback: (acc, iteration) => {
          switch (iteration.kind) {
            case 'instance':
              return {
                ...acc,
                lastIteration: iteration,
                trees: [...acc.trees, iteration.tree],
                instanceCount: acc.instanceCount + 1,
              };
            case 'discard':
              return {
                ...acc,
                lastIteration: iteration,
                discardCount: acc.discardCount + 1,
              };
            default:
              return {
                ...acc,
                lastIteration: iteration,
              };
          }
        },
      }),
      takeWhileInclusive((acc) => {
        if (acc.lastIteration.kind === 'exhausted') return false;
        return acc.instanceCount < iterationCount;
      }),
    ),
  )!;

  switch (sampleAccumulator.lastIteration.kind) {
    case 'instance':
      return Result.ofValue({
        values: sampleAccumulator.trees,
        discards: sampleAccumulator.discardCount,
      });
    case 'error':
      return Result.ofError(sampleAccumulator.lastIteration.message);
    case 'exhausted':
      return Result.ofError(
        `Exhausted after ${sampleAccumulator.instanceCount} instance(s), (${sampleAccumulator.discardCount} discard(s))`,
      );
    default:
      throw new Error('Unhandled: ' + JSON.stringify(sampleAccumulator));
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
