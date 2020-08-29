import * as fc from 'fast-check';
import * as devCore from 'pbt-core';
import * as dev from '../../src';
import { DEFAULT_MAX_ITERATIONS } from './constants';
import { GenStub } from './stubs';

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

export type GenConstraints = {
  minLength: number;
};

const resolveGenConstraints = (constraints: Partial<GenConstraints>): GenConstraints => ({
  minLength: 0,
  ...constraints,
});

export const arbitraryGen = (constraints: Partial<GenConstraints> = {}): fc.Arbitrary<devCore.Gen<unknown>> => {
  const resolvedConstraints = resolveGenConstraints(constraints);
  return arbitraryGenValues(resolvedConstraints.minLength).map((values) => GenStub.exhaustAfter(values));
};

export type GensConstraints = GenConstraints & {
  minGens: number;
  genArbitrary: fc.Arbitrary<devCore.Gen<unknown>>;
};

const resolveGensConstraints = (constraints: Partial<GensConstraints>): GensConstraints => ({
  minGens: 1,
  genArbitrary: arbitraryGen(constraints),
  ...resolveGenConstraints(constraints),
});

export const arbitraryGens = (constraints: Partial<GensConstraints> = {}): fc.Arbitrary<devCore.Gens> => {
  const resolvedConstraints = resolveGensConstraints(constraints);
  return fc.array(resolvedConstraints.genArbitrary, resolvedConstraints.minGens, 20) as fc.Arbitrary<devCore.Gens>;
};

export const arbitraryNonEmptyGen = (): fc.Arbitrary<devCore.Gen<unknown>> => arbitraryGen({ minLength: 1 });

export const arbitrarySucceedingPropertyFunction = <T extends devCore.Gens>(): fc.Arbitrary<dev.PropertyFunction<T>> =>
  fc.constant(() => true);

export const arbitraryFailingPropertyFunction = <T extends devCore.Gens>(): fc.Arbitrary<dev.PropertyFunction<T>> =>
  fc.constant(() => false);

export const arbitraryPropertyFunction = <T extends devCore.Gens>(): fc.Arbitrary<dev.PropertyFunction<T>> =>
  fc.oneof(arbitrarySucceedingPropertyFunction(), arbitraryFailingPropertyFunction());

export const arbitraryIterations = (maxIterations: number): fc.Arbitrary<number> => fc.integer(1, maxIterations);

export const arbitrarySeed = (): fc.Arbitrary<devCore.Seed> =>
  fc.nat().map((nextInt) => {
    let seed: devCore.Seed = {
      nextInt: () => nextInt,
      split: () => [seed, seed],
    };

    return seed;
  });

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
