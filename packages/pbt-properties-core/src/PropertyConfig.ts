import { Seed } from 'pbt-generator-core';
import { PropertyValidationFailure } from './PropertyResult';

export type PropertyConfig = {
  iterations: number;
  seed: Seed;
};

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

export const validateConfig = (config: PropertyConfig): PropertyValidationFailure | null =>
  validateIterations(config.iterations);
