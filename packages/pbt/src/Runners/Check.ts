import { last, pipe } from 'ix/iterable';
import { filter, map, scan } from 'ix/iterable/operators';
import { Seed, Size, takeWhileInclusive } from '../Core';
import { Property, PropertyIteration, Counterexample, ShrinkIteration } from '../Property2';
import { Exhaustible, ExhaustionStrategy } from './ExhaustionStrategy';

export type CheckConfig = {
  seed: Seed | number;
  size: Size;
  iterations: number;
};

export namespace CheckResult {
  export type Unfalsified = {
    kind: 'unfalsified';
    iterations: number;
  };

  export type Falsified<Ts extends any[]> = {
    kind: 'falsified';
    counterexample: Counterexample<Ts>;
    iterations: number;
  };

  export type Exhausted = {
    kind: 'exhausted';
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

type CheckAccumulator<Ts extends any[]> = {
  lastIteration: Exhaustible<PropertyIteration<Ts>>;
  passIterations: number;
};

export const check = <Ts extends any[]>(property: Property<Ts>, config: Partial<CheckConfig> = {}): CheckResult<Ts> => {
  const { seed, size, iterations: iterationCount }: CheckConfig = {
    seed: Seed.spawn(),
    size: 0,
    iterations: 100,
    ...config,
  };

  const exhaustionStrategy = ExhaustionStrategy.whenAll(
    ExhaustionStrategy.whenDiscardRateExceeds(0.999),
    ExhaustionStrategy.whenDiscardCountExceeds(99),
  );

  const checkAccumulator = last(
    pipe(
      property.run(seed, size),
      ExhaustionStrategy.apply(exhaustionStrategy, (iteration) => iteration.kind === 'discard'),
      scan<Exhaustible<PropertyIteration<Ts>>, CheckAccumulator<Ts>>({
        seed: {
          lastIteration: { kind: 'pass' } as PropertyIteration<Ts>,
          passIterations: 0,
        },
        callback: (acc, curr) => {
          switch (curr.kind) {
            case 'pass':
              return {
                ...acc,
                passIterations: acc.passIterations + 1,
              };
            default:
              return {
                ...acc,
                lastIteration: curr,
              };
          }
        },
      }),
      takeWhileInclusive((acc) => {
        if (acc.lastIteration.kind === 'exhausted') return false;
        return acc.passIterations < iterationCount;
      }),
    ),
  )!;

  switch (checkAccumulator.lastIteration.kind) {
    case 'pass':
      return {
        kind: 'unfalsified',
        iterations: checkAccumulator.passIterations,
      };
    case 'fail':
      return {
        kind: 'falsified',
        counterexample:
          last(
            pipe(
              checkAccumulator.lastIteration.shrinks,
              filter(ShrinkIteration.isFail),
              map((shrink) => shrink.counterexample),
            ),
          ) || checkAccumulator.lastIteration.counterexample,
        iterations: checkAccumulator.passIterations,
      };
    case 'error':
      return {
        kind: 'error',
      };
    default:
      throw new Error('Unhandled: ' + JSON.stringify(checkAccumulator));
  }
};
