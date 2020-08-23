import { Gen } from 'pbt-generator-core';

export type PropertyValidationFailure = {
  kind: 'validationFailure';
  problem: {
    kind: 'iterations';
    message: string;
  };
};

export type PropertyFailure = {
  kind: 'failure';
};

export type PropertySuccess = {
  kind: 'success';
};

export type PropertyResult = PropertyValidationFailure | PropertySuccess | PropertyFailure;

export interface Property<T> {
  (iterations: number): PropertyResult;
}

const validateIterations = (iterations: number): PropertyValidationFailure | null => {
  if (iterations < 1) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'iterations',
        message: 'Number of iterations must be greater than 0',
      },
    };
  }

  if (Math.round(iterations) !== iterations) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'iterations',
        message: 'Number of iterations must be an integer',
      },
    };
  }

  return null;
};

export const property = <T>(g: Gen<T>, f: (x: T) => boolean): Property<T> => {
  return iterations => {
    const iterationsValidationError = validateIterations(iterations);
    if (iterationsValidationError) return iterationsValidationError;

    for (const genInstance of g(0, 0)) {
      if (genInstance.kind === 'instance') {
        if (f(genInstance.value) === false) {
          return {
            kind: 'failure',
          };
        }
      }
    }

    return {
      kind: 'success',
    };
  };
};
