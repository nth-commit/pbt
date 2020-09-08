import { Gens } from 'pbt-core';
import { GenValues } from './GenValues';

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
        minimalCounterexample: GenValues<TGens>;
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
  minimalCounterexample: GenValues<TGens>,
): PropertyFailure<TGens> => ({
  kind: 'failure',
  problem: {
    kind: 'predicate',
    minimalCounterexample,
  },
});

export const success = (): PropertySuccess => ({
  kind: 'success',
});
