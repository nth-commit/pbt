import * as fc from 'fast-check';
import * as devGen from 'pbt-gen';
import * as devCore from 'pbt-core';
import * as dev from '../../src';
import { DEFAULT_MAX_ITERATIONS } from './constants';
import { withInvocationCount } from './functionHelpers';

export type Extender<T extends any[], U> = (...args: T) => fc.Arbitrary<U>;

export type ExtendableArbitrary<T extends any[]> = {
  extend: <U>(f: Extender<T, U>) => ExtendableArbitrary<[...T, U]>;
  toArbitrary: () => fc.Arbitrary<[...T]>;
};

export const extendableArbitrary = (): ExtendableArbitrary<[]> => {
  const createExtendableTuple = <TPrev extends any[]>(arbitrary: fc.Arbitrary<TPrev>): ExtendableArbitrary<TPrev> => ({
    toArbitrary: () => arbitrary,
    extend: <TNext>(f: Extender<TPrev, TNext>) => {
      const nextArb: fc.Arbitrary<[...TPrev, TNext]> = arbitrary.chain((args) => f(...args).map((x) => [...args, x]));
      return createExtendableTuple<[...TPrev, TNext]>(nextArb);
    },
  });

  return createExtendableTuple<[]>(fc.constant([]));
};

export const arbitraryGenValue = (): fc.Arbitrary<unknown> => fc.anything();

export const arbitraryGenValues = (minLength: number): fc.Arbitrary<unknown[]> =>
  fc.array(arbitraryGenValue(), minLength, 200);

export const arbitraryGen = () => fc.constant(devGen.integer.constant(0, 10));

export const arbitraryGens = () => fc.array(arbitraryGen(), 0, 20);

export const arbitrarySucceedingPropertyFunction = <Values extends any[]>(): fc.Arbitrary<
  dev.PropertyFunction<Values>
> => fc.constant(() => true);

export const arbitraryFailingPropertyFunction = <Values extends any[]>(
  failAfterIterations: number = 0,
): fc.Arbitrary<dev.PropertyFunction<Values>> => {
  return fc.oneof(
    fc.constant(withInvocationCount((i) => i < failAfterIterations)),
    fc.anything().map((error) =>
      withInvocationCount((i) => {
        if (i < failAfterIterations) return;
        throw error;
      }),
    ),
  );
};

export const arbitraryPropertyFunction = <Values extends any[]>(): fc.Arbitrary<dev.PropertyFunction<Values>> =>
  fc.oneof(arbitrarySucceedingPropertyFunction(), arbitraryFailingPropertyFunction());

export const arbitraryIterations = (maxIterations: number): fc.Arbitrary<number> => fc.integer(1, maxIterations);

export const arbitrarySeed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create);

export const arbitrarySize = (): fc.Arbitrary<devCore.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const arbitraryPropertyConfig = (
  maxIterations: number = DEFAULT_MAX_ITERATIONS,
): fc.Arbitrary<dev.PropertyConfig> => {
  return fc
    .tuple(arbitraryIterations(maxIterations), arbitrarySeed(), arbitrarySize())
    .map(([iterations, seed, size]) => ({ iterations, seed, size }));
};

export const arbitraryDecimal = (min: number, max: number): fc.Arbitrary<number> =>
  fc.float(min, max).filter((x) => x.toString().includes('.'));

export const arbitrarilyShuffleArray = <T>(arr: T[]): fc.Arbitrary<T[]> => {
  return fc.array(fc.nat(), arr.length, arr.length).map((orders) =>
    arr
      .map((value, i) => ({ value: value, order: orders[i] }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.value),
  );
};

export const arbitrarilyShuffleIn = <T>(arr: T[], target: T): fc.Arbitrary<T[]> =>
  arbitrarilyShuffleArray([...arr, target]);
