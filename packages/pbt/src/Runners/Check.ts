import { last, pipe } from 'ix/iterable';
import { scan } from 'ix/iterable/operators';
import { Seed, Size, takeWhileInclusive } from '../Core';
import { Property, PropertyIteration, Counterexample, ShrinkIteration } from '../Property';
import { Exhaustible, ExhaustionStrategy } from './ExhaustionStrategy';

export type CheckConfig = {
  seed: Seed | number;
  size: Size;
  iterations: number;
  path?: number[];
};

export namespace CheckResult {
  export type Unfalsified = {
    kind: 'unfalsified';
    iterations: number;
    discards: number;
  };

  export type Falsified<Ts extends any[]> = {
    kind: 'falsified';
    counterexample: Counterexample<Ts>;
    iterations: number;
    shrinkIterations: number;
    discards: number;
    seed: number;
    size: number;
  };

  export type Exhausted = {
    kind: 'exhausted';
    iterations: number;
    discards: number;
  };

  export type Error = {
    kind: 'error';
  };
}

export type CheckResult<Ts extends any[]> =
  | CheckResult.Unfalsified
  | CheckResult.Falsified<Ts>
  | CheckResult.Error
  | CheckResult.Exhausted;

export const check = <Ts extends any[]>(property: Property<Ts>, config: Partial<CheckConfig> = {}): CheckResult<Ts> => {
  const resolvedConfig: CheckConfig = {
    seed: Seed.spawn(),
    size: 0,
    iterations: 100,
    ...config,
  };

  const iterationAccumulator = accumulateIterations<Ts>(property, resolvedConfig);

  switch (iterationAccumulator.lastIteration.kind) {
    case 'pass':
      return {
        kind: 'unfalsified',
        iterations: iterationAccumulator.iterationCount,
        discards: iterationAccumulator.discardCount,
      };
    case 'fail':
      const shrinkResult = accumulateShrinks(iterationAccumulator.lastIteration);
      return {
        kind: 'falsified',
        iterations: iterationAccumulator.iterationCount,
        discards: iterationAccumulator.discardCount,
        seed: iterationAccumulator.lastIteration.seed.valueOf(),
        size: iterationAccumulator.lastIteration.size,
        ...shrinkResult,
      };
    case 'error':
      return {
        kind: 'error',
      };
    case 'exhausted':
      return {
        kind: 'exhausted',
        iterations: iterationAccumulator.iterationCount,
        discards: iterationAccumulator.discardCount,
      };
    default:
      throw new Error('Unhandled: ' + JSON.stringify(iterationAccumulator));
  }
};

type IterationAccumulator<Ts extends any[]> = {
  lastIteration: Exhaustible<PropertyIteration<Ts>>;
  iterationCount: number;
  discardCount: number;
};

const accumulateIterations = <Ts extends any[]>(property: Property<Ts>, config: CheckConfig) =>
  last(
    pipe(
      property.run(config.seed, config.size, { path: config.path }),
      ExhaustionStrategy.apply(ExhaustionStrategy.defaultStrategy(), (iteration) => iteration.kind === 'discard'),
      scan<Exhaustible<PropertyIteration<Ts>>, IterationAccumulator<Ts>>({
        seed: {
          lastIteration: { kind: 'pass' } as PropertyIteration<Ts>,
          iterationCount: 0,
          discardCount: 0,
        },
        callback: (acc, curr) => {
          switch (curr.kind) {
            case 'pass':
            case 'fail':
            case 'error':
              return {
                ...acc,
                lastIteration: curr,
                iterationCount: acc.iterationCount + 1,
              };
            case 'discard':
              return {
                ...acc,
                lastIteration: curr,
                discardCount: acc.discardCount + 1,
              };
            case 'exhausted':
              return {
                ...acc,
                lastIteration: curr,
              };
          }
        },
      }),
      takeWhileInclusive((acc) => {
        if (acc.lastIteration.kind === 'exhausted') return false;
        return acc.iterationCount < config.iterations;
      }),
    ),
  )!;

type ShrinkAccumulator<Ts extends any[]> = Pick<CheckResult.Falsified<Ts>, 'counterexample' | 'shrinkIterations'>;

const accumulateShrinks = <Ts extends any[]>(failIteration: PropertyIteration.Fail<Ts>): ShrinkAccumulator<Ts> => {
  const initialShrink: ShrinkAccumulator<Ts> = {
    shrinkIterations: 0,
    counterexample: failIteration.counterexample,
  };

  return (
    last(
      pipe(
        failIteration.shrinks,
        scan<ShrinkIteration<Ts>, ShrinkAccumulator<Ts>>({
          seed: { shrinkIterations: 0, counterexample: failIteration.counterexample },
          callback: (acc, curr) => {
            switch (curr.kind) {
              case 'fail':
                return {
                  counterexample: curr.counterexample,
                  shrinkIterations: acc.shrinkIterations + 1,
                };
              case 'pass':
                return {
                  ...acc,
                  shrinkIterations: acc.shrinkIterations + 1,
                };
            }
          },
        }),
      ),
    ) || initialShrink
  );
};
