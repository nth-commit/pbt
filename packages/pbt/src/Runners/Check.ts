import { last, pipe } from 'ix/iterable';
import { scan } from 'ix/iterable/operators';
import { Rng, Size, takeWhileInclusive } from '../Core';
import { Property } from '../Property';
import { getDefaultConfig } from './DefaultConfig';
import { Exhaustible, ExhaustionStrategy } from './ExhaustionStrategy';

export type CheckConfig = {
  seed: number;
  size: Size | undefined;
  iterations: number;
  path: string | undefined;
};

export namespace CheckResult {
  export type Unfalsified = {
    kind: 'unfalsified';
    iterations: number;
    discards: number;
  };

  export type Falsified<Ts extends any[]> = {
    kind: 'falsified';
    counterexample: Property.Counterexample<Ts>;
    iterations: number;
    shrinkIterations: number;
    discards: number;
    seed: number;
    size: number;
    shrinks: Ts[];
  };

  export type Exhausted = {
    kind: 'exhausted';
    iterations: number;
    discards: number;
  };

  export type Error = {
    kind: 'error';
    iterations: number;
  };
}

export type CheckResult<Ts extends any[]> =
  | CheckResult.Unfalsified
  | CheckResult.Falsified<Ts>
  | CheckResult.Error
  | CheckResult.Exhausted;

export const check = <Ts extends any[]>(property: Property<Ts>, config: Partial<CheckConfig> = {}): CheckResult<Ts> => {
  const resolvedConfig: CheckConfig = {
    path: undefined,
    size: undefined,
    ...getDefaultConfig(),
    ...config,
  };

  // TODO: Clean up this
  if (resolvedConfig.iterations === 0) {
    return {
      kind: 'unfalsified',
      discards: 0,
      iterations: 0,
    };
  }

  const iterationAccumulator = accumulateIterations<Ts>(property, resolvedConfig);

  if (!iterationAccumulator) {
    return {
      kind: 'unfalsified',
      iterations: 0,
      discards: 0,
    };
  }

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
        seed: iterationAccumulator.lastIteration.initRng.seed,
        size: iterationAccumulator.lastIteration.initSize,
        ...shrinkResult,
      };
    case 'error':
      return {
        kind: 'error',
        iterations: iterationAccumulator.iterationCount,
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
  lastIteration: Exhaustible<Property.PropertyIteration<Ts>>;
  iterationCount: number;
  discardCount: number;
};

const accumulateIterations = <Ts extends any[]>(property: Property<Ts>, config: CheckConfig) =>
  last(
    pipe(
      property.run(config.seed, config.iterations, { size: config.size, path: config.path }),
      ExhaustionStrategy.apply(ExhaustionStrategy.defaultStrategy(), (iteration) => iteration.kind === 'discard'),
      scan<Exhaustible<Property.PropertyIteration<Ts>>, IterationAccumulator<Ts>>({
        seed: {
          lastIteration: {
            kind: 'pass',
            initRng: Rng.create(config.seed),
            nextRng: Rng.create(config.seed),
            initSize: config.size || 0,
            nextSize: config.size || 0,
          },
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
        if (acc.lastIteration === null) return true;
        if (acc.lastIteration.kind === 'exhausted') return false;
        return acc.iterationCount < config.iterations;
      }),
    ),
  );

type ShrinkAccumulator<Ts extends any[]> = Pick<CheckResult.Falsified<Ts>, 'counterexample' | 'shrinkIterations'> & {
  shrinks: Ts[];
};

const accumulateShrinks = <Ts extends any[]>(
  failIteration: Property.PropertyIteration.Fail<Ts>,
): ShrinkAccumulator<Ts> => {
  const initialShrink: ShrinkAccumulator<Ts> = {
    shrinkIterations: 0,
    counterexample: failIteration.counterexample,
    shrinks: [],
  };

  return (
    last(
      pipe(
        failIteration.shrinks,
        scan<Property.ShrinkIteration<Ts>, ShrinkAccumulator<Ts>>({
          seed: {
            shrinkIterations: 0,
            counterexample: failIteration.counterexample,
            shrinks: [],
          },
          callback: (acc, curr) => {
            switch (curr.kind) {
              case 'fail':
                return {
                  counterexample: curr.counterexample,
                  shrinkIterations: acc.shrinkIterations + 1,
                  shrinks: [...acc.shrinks, curr.counterexample.value],
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
