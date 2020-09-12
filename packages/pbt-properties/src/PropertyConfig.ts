import { Seed, Size } from 'pbt-core';
import { PropertyValidationFailure } from './PropertyResult';

export type PropertyConfig = {
  iterations: number;
  seed: Seed;
  size: Size;
  shrinkPath?: number[];
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

const validateShrinkPath = (shrinkPath: number[] | undefined): PropertyValidationFailure | null => {
  if (shrinkPath === undefined) return null;

  if (shrinkPath.some((x) => isInteger(x) === false)) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'shrinkPath',
        message: 'Shrink path may only contain integers',
      },
    };
  }

  if (shrinkPath.some((x) => x < 0)) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'shrinkPath',
        message: 'Shrink path may not contain negative numbers',
      },
    };
  }

  return null;
};

export const preValidateConfig = (config: PropertyConfig): PropertyValidationFailure | null =>
  validateIterations(config.iterations) || validateSize(config.size) || validateShrinkPath(config.shrinkPath);
