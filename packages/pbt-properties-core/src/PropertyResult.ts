export type PropertyValidationFailure = {
  kind: 'validationFailure';
  problem: {
    kind: 'iterations' | 'size';
    message: string;
  };
};

export type PropertyFailure = {
  kind: 'failure';
  problem:
    | {
        kind: 'predicate';
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

export type PropertyResult = PropertyValidationFailure | PropertySuccess | PropertyFailure;

export const exhaustionFailure = (iterationsRequested: number, iterationsCompleted: number): PropertyFailure => ({
  kind: 'failure',
  problem: {
    kind: 'exhaustion',
    iterationsRequested,
    iterationsCompleted,
  },
});

export const predicateFailure = (): PropertyFailure => ({
  kind: 'failure',
  problem: {
    kind: 'predicate',
  },
});

export const success = (): PropertySuccess => ({
  kind: 'success',
});
