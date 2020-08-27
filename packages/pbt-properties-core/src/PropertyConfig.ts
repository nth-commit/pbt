import { Seed, Size } from 'pbt-generator-core';
import { PropertyValidationFailure } from './PropertyResult';

export type PropertyConfig = {
  iterations: number;
  seed: Seed;
  size: Size;
};

const isInteger = (n: number): boolean => Math.round(n) === n;

const validateIterations = (iterations: number): PropertyValidationFailure | null => {
  if (isInteger(iterations) === false) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'iterations',
        message: 'Number of iterations must be an integer',
      },
    };
  }

  if (iterations < 1) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'iterations',
        message: 'Number of iterations must be greater than 0',
      },
    };
  }

  return null;
};

const validateSize = (size: Size): PropertyValidationFailure | null => {
  if (isInteger(size) === false) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'size',
        message: 'Size must be an integer',
      },
    };
  }

  if (size < 0) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'size',
        message: 'Size must be greater than or equal to 0',
      },
    };
  }

  if (size > 100) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'size',
        message: 'Size must be less than or equal to 100',
      },
    };
  }

  return null;
};

export const validateConfig = (config: PropertyConfig): PropertyValidationFailure | null =>
  validateIterations(config.iterations) || validateSize(config.size);
