import { Seed, Size } from 'pbt-core';
import { PropertyCounterexample } from './runProperty';

export namespace PropertyResult {
  export type Success = {
    kind: 'success';
  };

  export type Failure<Values extends any[]> = {
    kind: 'failure';
    reason: 'predicate';
    seed: Seed;
    size: Size;
    counterexample: PropertyCounterexample<Values>;
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

export const exhaustionFailure = (
  iterationsRequested: number,
  iterationsCompleted: number,
): PropertyResult.Exhausted => ({
  kind: 'exhaustion',
  iterationsRequested,
  iterationsCompleted,
});

export const predicateFailure = <Values extends any[]>(
  seed: Seed,
  size: Size,
  counterexample: PropertyCounterexample<Values>,
): PropertyResult.Failure<Values> => ({
  kind: 'failure',
  reason: 'predicate',
  seed,
  size,
  counterexample,
});

export const success = (): PropertyResult.Success => ({
  kind: 'success',
});
