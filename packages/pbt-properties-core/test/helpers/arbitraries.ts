import * as fc from 'fast-check';
import { PropertyFunction } from '../../src';
import { DEFAULT_MAX_ITERATIONS } from './constants';

export const arbitraryGenValue = (): fc.Arbitrary<unknown> => fc.anything();

export const arbitraryGenValues = (): fc.Arbitrary<unknown[]> => fc.array(arbitraryGenValue());

export const arbitrarySucceedingPropertyFunction = <T>(): fc.Arbitrary<PropertyFunction<T>> => fc.constant(() => true);

export const arbitraryFailingPropertyFunction = <T>(): fc.Arbitrary<PropertyFunction<T>> => fc.constant(() => false);

export const arbitraryPropertyFunction = <T>(): fc.Arbitrary<PropertyFunction<T>> =>
  fc.oneof(arbitrarySucceedingPropertyFunction(), arbitraryFailingPropertyFunction());

export const arbitraryIterations = (maxIterations: number = DEFAULT_MAX_ITERATIONS): fc.Arbitrary<number> =>
  fc.integer(1, maxIterations);

export const arbitraryPropertyFixture = (
  maxIterations: number = DEFAULT_MAX_ITERATIONS,
): fc.Arbitrary<{ values: unknown[]; iterations: number }> =>
  arbitraryIterations(maxIterations).chain(iterations =>
    fc.array(arbitraryGenValue(), iterations, maxIterations).map(values => ({ values, iterations })),
  );

export const arbitraryDecimal = (min?: number, max?: number): fc.Arbitrary<number> =>
  fc.float(min || Number.MIN_SAFE_INTEGER, max || Number.MAX_SAFE_INTEGER).filter(x => x.toString().includes('.'));
