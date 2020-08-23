import * as fc from 'fast-check';
import { Gen } from 'pbt-generator-core';
import { DEFAULT_MAX_ITERATIONS } from './constants';

export const arbitraryGenValue = (): fc.Arbitrary<unknown> => fc.anything();

export const arbitraryGenValues = (): fc.Arbitrary<unknown[]> => fc.array(arbitraryGenValue());

export const arbitraryFunction = <T>(valueArbitrary: fc.Arbitrary<T>): fc.Arbitrary<(...args: any[]) => T> =>
  valueArbitrary.map(x => () => x);

export const arbitraryPredicate = (): fc.Arbitrary<(...args: any[]) => boolean> => arbitraryFunction(fc.boolean());

export const arbitraryPropertyFixture = (
  maxIterations: number = DEFAULT_MAX_ITERATIONS,
): fc.Arbitrary<{ values: unknown[]; iterations: number }> =>
  fc
    .integer(1, maxIterations)
    .chain(iterations =>
      fc.array(arbitraryGenValue(), iterations, maxIterations).map(values => ({ values, iterations })),
    );

export const arbitraryDecimal = (min?: number, max?: number): fc.Arbitrary<number> =>
  fc.float(min || Number.MIN_SAFE_INTEGER, max || Number.MAX_SAFE_INTEGER).filter(x => x.toString().includes('.'));
