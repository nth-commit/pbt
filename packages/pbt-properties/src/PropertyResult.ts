import { Gens, Seed, Size } from 'pbt-core';
import { PropertyCounterexample } from './runProperty';

export type ValidationProblem = {
  kind: 'iterations' | 'size' | 'shrinkPath';
  message: string;
};

export type PropertyValidationFailure = {
  kind: 'validationFailure';
  problem: ValidationProblem;
};

export type PropertyFailure<TGens extends Gens> = {
  kind: 'failure';
  reason: 'predicate';
  seed: Seed;
  size: Size;
  counterexample: PropertyCounterexample<TGens>;
};

export type ExhaustionFailure = {
  kind: 'exhaustion';
  iterationsRequested: number;
  iterationsCompleted: number;
};

export type PropertySuccess = {
  kind: 'success';
};

export type PropertyResult<TGens extends Gens> =
  | PropertyValidationFailure
  | PropertySuccess
  | PropertyFailure<TGens>
  | ExhaustionFailure;

export const exhaustionFailure = (iterationsRequested: number, iterationsCompleted: number): ExhaustionFailure => ({
  kind: 'exhaustion',
  iterationsRequested,
  iterationsCompleted,
});

export const predicateFailure = <TGens extends Gens>(
  seed: Seed,
  size: Size,
  counterexample: PropertyCounterexample<TGens>,
): PropertyFailure<TGens> => ({
  kind: 'failure',
  reason: 'predicate',
  seed,
  size,
  counterexample,
});

export const success = (): PropertySuccess => ({
  kind: 'success',
});
