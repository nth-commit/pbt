import { last, pipe, reduce } from 'ix/iterable';
import { Size } from '../Core';
import { Seed, takeWhileInclusive } from '../Gen2';
import { Property, PropertyResult, Counterexample } from '../Property2';

export type CheckConfig = {
  iterations: number;
  seed: Seed | number;
  size: Size;
  counterexamplePath: string | undefined;
};

export namespace CheckResult {
  export type Success = {
    kind: 'success';
    seed: number;
    size: Size;
    iterations: number;
    discards: number;
  };

  export type Abort = {
    kind: 'abort';
    seed: number;
    size: Size;
    iterations: number;
    discards: number;
  };

  export type Fail<Values extends any[]> = {
    kind: 'fail';
    seed: number;
    size: Size;
    iterationsUntilFalsified: number;
    iterationsAfterFalsified: number;
    discards: number;
    counterexample: Counterexample<Values>;
    counterexampleHistory: Counterexample<Values>[];
  };
}

export type CheckResult<Values extends any[]> = CheckResult.Success | CheckResult.Abort | CheckResult.Fail<Values>;

const mapPropertyResultToBaseCheckResult = (
  propertyResult: PropertyResult<unknown[]>,
): Pick<CheckResult<unknown[]>, 'seed' | 'size' | 'discards'> => ({
  seed: propertyResult.seed.valueOf(),
  size: propertyResult.size,
  discards: propertyResult.discards,
});

type CounterexampleAndHistory<Values extends any[]> = Pick<
  CheckResult.Fail<Values>,
  'counterexample' | 'counterexampleHistory'
>;

const iterateShrinks = <Values extends any[]>(
  falsifiedPropertyResult: PropertyResult.Falsified<Values>,
): CounterexampleAndHistory<Values> => {
  const initialResult: CounterexampleAndHistory<Values> = {
    counterexample: falsifiedPropertyResult.counterexample,
    counterexampleHistory: [falsifiedPropertyResult.counterexample],
  };

  return reduce(falsifiedPropertyResult.shrinks, {
    seed: initialResult,
    callback: (acc, curr, i) => {
      switch (curr.kind) {
        case 'counterexample':
          return {
            counterexample: {
              value: curr.value,
              complexity: curr.complexity,
              path: curr.path,
              reason: curr.reason,
            },
            counterexampleHistory: [...acc.counterexampleHistory, curr],
          };
        case 'nonCounterexample':
          return acc;
      }
    },
  });
};

const resolveConfig = (config: Partial<CheckConfig>): CheckConfig => ({
  seed: config.seed === undefined ? Seed.spawn() : config.seed,
  size: config.size === undefined ? 0 : config.size,
  iterations: config.iterations === undefined ? 100 : config.iterations,
  counterexamplePath: undefined,
});

const checkOnce = <Values extends any[]>(property: Property<Values>, config: CheckConfig): CheckResult<Values> => {
  const iterable = property(typeof config.seed === 'number' ? Seed.create(config.seed) : config.seed, config.size);
  const propertyResult = last(
    pipe(
      iterable,
      takeWhileInclusive((x) => x.iterations < config.iterations),
    ),
  )!;

  switch (propertyResult.kind) {
    case 'unfalsified':
      return {
        kind: 'success',
        iterations: propertyResult.iterations,
        ...mapPropertyResultToBaseCheckResult(propertyResult),
      };
    case 'error':
    case 'exhausted':
      return {
        kind: 'abort',
        iterations: propertyResult.iterations,
        ...mapPropertyResultToBaseCheckResult(propertyResult),
      };
    case 'falsified':
      return {
        kind: 'fail',
        iterationsUntilFalsified: propertyResult.iterations,
        iterationsAfterFalsified: 0,
        ...mapPropertyResultToBaseCheckResult(propertyResult),
        ...iterateShrinks(propertyResult),
      };
  }
};

const selectSmallestCounterexample = <Values extends any[]>(
  a: CheckResult.Fail<Values>,
  b: CheckResult.Fail<Values>,
): Counterexample<Values> => {
  if (a.counterexample.complexity < b.counterexample.complexity) {
    return a.counterexample;
  } else if (b.counterexample.complexity < a.counterexample.complexity) {
    return b.counterexample;
  } else {
    return a.size < b.size ? a.counterexample : b.counterexample;
  }
};

const mergeFails = <Values extends any[]>(
  lastFail: CheckResult.Fail<Values>,
  nextFail: CheckResult.Fail<Values>,
): CheckResult.Fail<Values> => {
  return {
    ...nextFail,
    discards: lastFail.discards,
    iterationsUntilFalsified: lastFail.iterationsUntilFalsified,
    iterationsAfterFalsified: lastFail.iterationsAfterFalsified + nextFail.iterationsUntilFalsified,
    counterexampleHistory: [...lastFail.counterexampleHistory, ...nextFail.counterexampleHistory],
    counterexample: selectSmallestCounterexample(lastFail, nextFail),
  };
};

const checkThoroughly = <Values extends any[]>(
  property: Property<Values>,
  initialConfig: CheckConfig,
  initialFail: CheckResult.Fail<Values>,
  recheckIterations: number,
): CheckResult<Values> => {
  let lastFail = initialFail;
  for (let i = 0; i < recheckIterations; i++) {
    const nextResult = checkOnce(property, {
      ...initialConfig,
      seed: initialFail.seed,
      size: Size.bigIncrement(lastFail.size),
    });

    if (nextResult.kind === 'success' || nextResult.kind === 'abort') {
      continue;
    }

    // TODO: Exit early if we detect that the counterexample has settled
    lastFail = mergeFails(lastFail, nextResult);
  }

  return lastFail;
};

export const check = <Values extends any[]>(
  property: Property<Values>,
  config: Partial<CheckConfig> = {},
): CheckResult<Values> => {
  const resolvedConfig = resolveConfig(config);
  const initialResult = checkOnce(property, resolvedConfig);

  switch (initialResult.kind) {
    case 'success':
    case 'abort':
      return initialResult;
    case 'fail':
      return checkThoroughly(property, resolvedConfig, initialResult, 5);
  }
};
