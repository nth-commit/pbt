import { Gens, Seed, Size } from 'pbt-core';
import { PropertyCounterexample } from './runProperty';

export type PropertyValidationFailure = {
  kind: 'validationFailure';
  problem: {
    kind: 'iterations' | 'size';
    message: string;
  };
};

export type PropertyFailure<TGens extends Gens> = {
  kind: 'failure';
  problem:
    | {
        kind: 'predicate';
        seed: Seed;
        size: Size;
        counterexample: PropertyCounterexample<TGens>;
      }
    | {
        kind: 'exhaustion';
        iterationsRequested: number;
        iterationsCompleted: number;
      };
};

export type PropertySuccess = {
  kind: 'success';
};

export type PropertyResult<TGens extends Gens> = PropertyValidationFailure | PropertySuccess | PropertyFailure<TGens>;

export const exhaustionFailure = <TGens extends Gens>(
  iterationsRequested: number,
  iterationsCompleted: number,
): PropertyFailure<TGens> => ({
  kind: 'failure',
  problem: {
    kind: 'exhaustion',
    iterationsRequested,
    iterationsCompleted,
  },
});

export const predicateFailure = <TGens extends Gens>(
  seed: Seed,
  size: Size,
  counterexample: PropertyCounterexample<TGens>,
): PropertyFailure<TGens> => ({
  kind: 'failure',
  problem: {
    kind: 'predicate',
    seed,
    size,
    counterexample,
  },
});

export const success = (): PropertySuccess => ({
  kind: 'success',
});
