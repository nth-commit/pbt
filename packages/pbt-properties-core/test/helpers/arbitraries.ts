import * as fc from 'fast-check';
import { Gen, Seed } from 'pbt-generator-core';
import { PropertyFunction } from '../../src';
import { DEFAULT_MAX_ITERATIONS } from './constants';
import { GenStub } from './stubs';

export type PropertyFixture = {
  values: unknown[];
  iterations: number;
  seed: Seed;
};

export const arbitraryGenValue = (): fc.Arbitrary<unknown> => fc.anything();

export const arbitraryGenValues = (): fc.Arbitrary<unknown[]> => fc.array(arbitraryGenValue());

export const arbitraryGen = (): fc.Arbitrary<Gen<unknown>> =>
  fc.oneof(
    arbitraryGenValues().map(values => GenStub.fromArray(values)),
    arbitraryGenValues().map(values => GenStub.exhaustAfter(values)),
    fc.constant(GenStub.exhausted()),
  );

export const arbitrarySucceedingPropertyFunction = <T>(): fc.Arbitrary<PropertyFunction<T>> => fc.constant(() => true);

export const arbitraryFailingPropertyFunction = <T>(): fc.Arbitrary<PropertyFunction<T>> => fc.constant(() => false);

export const arbitraryPropertyFunction = <T>(): fc.Arbitrary<PropertyFunction<T>> =>
  fc.oneof(arbitrarySucceedingPropertyFunction(), arbitraryFailingPropertyFunction());

export const arbitraryIterations = (maxIterations: number = DEFAULT_MAX_ITERATIONS): fc.Arbitrary<number> =>
  fc.integer(1, maxIterations);

export const arbitrarySeed = (): fc.Arbitrary<Seed> =>
  fc.nat().map(nextInt => {
    let seed: Seed = {
      nextInt: () => nextInt,
      split: () => [seed, seed],
    };

    return seed;
  });

export const arbitraryPropertyFixture = <T = unknown>(
  maxIterations: number = DEFAULT_MAX_ITERATIONS,
): fc.Arbitrary<PropertyFixture> =>
  fc
    .tuple(arbitraryIterations(maxIterations), arbitrarySeed())
    .chain<PropertyFixture>(([iterations, seed]) =>
      fc.array(arbitraryGenValue(), iterations, maxIterations).map(values => ({ values, iterations, seed })),
    );

export const arbitraryDecimal = (min?: number, max?: number): fc.Arbitrary<number> =>
  fc.float(min || Number.MIN_SAFE_INTEGER, max || Number.MAX_SAFE_INTEGER).filter(x => x.toString().includes('.'));
