import { Seed, Size } from 'pbt-core';

export namespace PropertyResult {
  export type Success = {
    kind: 'success';
  };

  export type Counterexample<Values extends any[]> = {
    originalValues: Values;
    values: Values;
    shrinkPath: number[];
  };

  export type FailureReason =
    | {
        kind: 'predicate';
      }
    | {
        kind: 'throws';
        error: unknown;
      };

  export type Failure<Values extends any[]> = {
    kind: 'failure';
    reason: FailureReason;
    seed: Seed;
    size: Size;
    iterationsRequested: number;
    iterationsCompleted: number;
    counterexample: Counterexample<Values>;
  };

  export type ValidationFailure = {
    kind: 'validationFailure';
    problem: {
      kind: 'iterations' | 'size' | 'shrinkPath';
      message: string;
    };
  };

  export type Exhausted = {
    kind: 'exhaustion';
    iterationsRequested: number;
    iterationsCompleted: number;
  };
}

export type PropertyResult<Values extends any[]> =
  | PropertyResult.Success
  | PropertyResult.ValidationFailure
  | PropertyResult.Failure<Values>
  | PropertyResult.Exhausted;

export const exhausted = (iterationsRequested: number, iterationsCompleted: number): PropertyResult.Exhausted => ({
  kind: 'exhaustion',
  iterationsRequested,
  iterationsCompleted,
});

export const failed = <Values extends any[]>(
  reason: PropertyResult.FailureReason,
  seed: Seed,
  size: Size,
  iterationsRequested: number,
  iterationsCompleted: number,
  counterexample: PropertyResult.Counterexample<Values>,
): PropertyResult.Failure<Values> => ({
  kind: 'failure',
  reason,
  seed,
  size,
  iterationsRequested,
  iterationsCompleted,
  counterexample,
});

export const success = (): PropertyResult.Success => ({
  kind: 'success',
});
