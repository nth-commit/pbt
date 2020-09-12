import { Seed } from 'pbt-core';
import { Property, PropertyConfig, PropertyResult } from 'pbt-properties';

export type RunConfig = {
  iterations: number;
  seed: number;
  size: number;
  shrinkPath: string | undefined;
};

export type Success = {
  kind: 'success';
};

export type ValidationFailure = {
  kind: 'validationFailure';
  problem: {
    kind: 'iterations' | 'size' | 'shrinkPath';
    message: string;
  };
};

export type Counterexample<Values extends any[]> = {
  originalValues: Values;
  values: Values;
  shrinkPath: string;
};

export type PredicateFailure<Values extends any[]> = {
  kind: 'failure';
  reason: 'predicate';
  seed: number;
  size: number;
  iterationsRequested: number;
  iterationsCompleted: number;
  counterexample: Counterexample<Values>;
};

export type ExhaustionFailure = {
  kind: 'exhaustion';
  iterationsRequested: number;
  iterationsCompleted: number;
};

export type RunResult<Values extends any[]> =
  | Success
  | ValidationFailure
  | PredicateFailure<Values>
  | ExhaustionFailure;

const toPropertyConfig = (runConfig: Partial<RunConfig>): PropertyConfig => ({
  iterations: runConfig.iterations === undefined ? 100 : runConfig.iterations,
  seed: runConfig.seed === undefined ? Seed.spawn() : Seed.create(runConfig.seed),
  size: runConfig.size === undefined ? 0 : runConfig.size,
  shrinkPath: runConfig.shrinkPath === undefined ? undefined : runConfig.shrinkPath.split(':').map((n) => parseInt(n)),
});

const toRunResult = <Values extends any[]>(propertyResult: PropertyResult<Values>): RunResult<Values> => {
  switch (propertyResult.kind) {
    case 'success':
    case 'validationFailure':
    case 'exhaustion':
      return propertyResult;
    case 'failure':
      return {
        ...propertyResult,
        seed: propertyResult.seed.valueOf(),
        counterexample: {
          ...propertyResult.counterexample,
          shrinkPath: propertyResult.counterexample.shrinkPath.join(':'),
        },
      };
  }
};

export const run = <Values extends any[]>(p: Property<Values>, config: Partial<RunConfig> = {}): RunResult<Values> => {
  return toRunResult(p(toPropertyConfig(config)));
};
