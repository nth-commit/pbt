import { last, pipe } from 'ix/iterable';
import { scan } from 'ix/iterable/operators';
import { Size } from '../Core';
import { takeWhileInclusive } from '../Core/iterableOperators';
import { Result } from '../Core/Result';
import { Gen, GenIteration } from '../Gen';
import { GenTree } from '../GenTree';
import { Rng } from '../Number';
import { getDefaultConfig } from './DefaultConfig';
import { Exhaustible, ExhaustionStrategy } from './ExhaustionStrategy';

export type SampleConfig = {
  seed: number;
  size: Size;
  iterations: number;
};

export namespace SampleResult {
  export type Success<T> = {
    kind: 'success';
    values: T[];
    discards: number;
    seed: number;
    size: number;
  };

  export type Error = {
    kind: 'error';
    message: string;
    seed: number;
    size: number;
  };
}

export type Sample<T> = {
  values: T[];
  discards: number;
  seed: number;
  size: number;
};

export type OneSample<T> = {
  value: T;
  discards: number;
  seed: number;
  size: number;
};

export type SampleResult<T> = Result<Sample<T>, string>;

type SampleAccumulator<T> = {
  trees: GenTree<T>[];
  lastIteration: Exhaustible<GenIteration<T>>;
  instanceCount: number;
  discardCount: number;
};

export const sampleTreesInternal = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleResult<GenTree<T>> => {
  const { seed, size, iterations: iterationCount }: SampleConfig = {
    size: 50,
    ...getDefaultConfig(),
    ...config,
  };

  const rng = Rng.create(seed);

  const sampleAccumulator = last(
    pipe(
      gen.run(rng, size, {}),
      ExhaustionStrategy.asOperator((iteration) => iteration.kind === 'discard'),
      scan<Exhaustible<GenIteration<T>>, SampleAccumulator<T>>({
        seed: {
          trees: [],
          instanceCount: 0,
          discardCount: 0,
          lastIteration: {
            kind: 'instance',
            initRng: rng,
            nextRng: rng,
            initSize: size,
            nextSize: size,
            tree: null as any,
          },
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
        if (acc.lastIteration.kind === 'exhausted' || acc.lastIteration.kind === 'error') return false;
        return acc.instanceCount < iterationCount;
      }),
    ),
  )!;

  switch (sampleAccumulator.lastIteration.kind) {
    case 'instance':
    case 'discard':
      return Result.ofValue({
        values: sampleAccumulator.trees,
        discards: sampleAccumulator.discardCount,
        seed: sampleAccumulator.lastIteration.initRng.seed,
        size: sampleAccumulator.lastIteration.initSize,
      });
    case 'error':
      return Result.ofError(sampleAccumulator.lastIteration.message);
    case 'exhausted':
      return Result.ofError(
        `Exhausted after ${sampleAccumulator.instanceCount} instance(s), (${sampleAccumulator.discardCount} discard(s))`,
      );
  }
};

export const sampleInternal = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleResult<T> =>
  sampleTreesInternal(gen, config).map<Sample<T>>((sample) => ({
    ...sample,
    discards: sample.discards,
    values: sample.values.map((tree) => tree.node.value),
  }));

export const sampleTrees = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): Sample<GenTree<T>> =>
  sampleTreesInternal(gen, config).asOk((message) => new Error(message));

export const sample = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): Sample<T> =>
  sampleInternal(gen, config).asOk((message) => new Error(message));

export const singleSample = <T>(gen: Gen<T>, config: Partial<Omit<SampleConfig, 'iterations'>> = {}): OneSample<T> => {
  const sampleResult = sample(gen, { ...config, iterations: 1 });
  return {
    ...sampleResult,
    value: sampleResult.values[0],
  };
};
