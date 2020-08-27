import * as fc from 'fast-check';
import { Gen, Seed } from 'pbt-generator-core';
import { Gens, PropertyFunction, PropertyConfig } from '../../src';
import { DEFAULT_MAX_ITERATIONS } from './constants';
import { GenStub } from './stubs';

export type Extender<T extends any[], U> = (...args: T) => fc.Arbitrary<U>;

export type ExtendableTupleArbitrary<T extends any[]> = {
  extend: <U>(f: Extender<T, U>) => ExtendableTupleArbitrary<[...T, U]>;
  toArbitrary: () => fc.Arbitrary<[...T]>;
};

export const arbitraryExtendableTuple = <T>(arb: fc.Arbitrary<T>): ExtendableTupleArbitrary<[T]> => {
  const createExtendableTuple = <TPrev extends any[]>(
    arbitrary: fc.Arbitrary<TPrev>,
  ): ExtendableTupleArbitrary<TPrev> => ({
    toArbitrary: () => arbitrary,
    extend: <TNext>(f: Extender<TPrev, TNext>) => {
      const nextArb: fc.Arbitrary<[...TPrev, TNext]> = arbitrary.chain((args) => f(...args).map((x) => [...args, x]));
      return createExtendableTuple<[...TPrev, TNext]>(nextArb);
    },
  });

  return createExtendableTuple<[T]>(arb.map((x) => [x]));
};

export type PropertyFixture = {
  values: unknown[];
  iterations: number;
  seed: Seed;
};

export const arbitraryGenValue = (): fc.Arbitrary<unknown> => fc.anything();

export const arbitraryGenValues = (minLength = 0): fc.Arbitrary<unknown[]> =>
  fc.array(arbitraryGenValue(), minLength, 200);

export type GenConstraints = {
  minLength: number;
};

const resolveGenConstraints = (constraints: Partial<GenConstraints>): GenConstraints => ({
  minLength: 0,
  ...constraints,
});

export const arbitraryGen = (constraints: Partial<GenConstraints> = {}): fc.Arbitrary<Gen<unknown>> => {
  const resolvedConstraints = resolveGenConstraints(constraints);
  return arbitraryGenValues(resolvedConstraints.minLength).map((values) => GenStub.exhaustAfter(values));
};

export type GensConstraints = GenConstraints & {
  minGens: number;
  genArbitrary: fc.Arbitrary<Gen<unknown>>;
};

const resolveGensConstraints = (constraints: Partial<GensConstraints>): GensConstraints => ({
  minGens: 1,
  genArbitrary: arbitraryGen(constraints),
  ...resolveGenConstraints(constraints),
});

export const arbitraryGens = (constraints: Partial<GensConstraints>): fc.Arbitrary<Gens> => {
  const resolvedConstraints = resolveGensConstraints(constraints);
  return fc.array(resolvedConstraints.genArbitrary, resolvedConstraints.minGens, 20) as fc.Arbitrary<Gens>;
};

export const arbitraryNonEmptyGen = (): fc.Arbitrary<Gen<unknown>> => arbitraryGen({ minLength: 1 });

export const arbitraryExhaustingGen = (): fc.Arbitrary<Gen<unknown>> =>
  arbitraryGenValues().map((values) => GenStub.exhaustAfter(values));

export const arbitrarySucceedingPropertyFunction = <T extends Gens>(): fc.Arbitrary<PropertyFunction<T>> =>
  fc.constant(() => true);

export const arbitraryFailingPropertyFunction = <T extends Gens>(): fc.Arbitrary<PropertyFunction<T>> =>
  fc.constant(() => false);

export const arbitraryPropertyFunction = <T extends Gens>(): fc.Arbitrary<PropertyFunction<T>> =>
  fc.oneof(arbitrarySucceedingPropertyFunction(), arbitraryFailingPropertyFunction());

export const arbitraryIterations = (maxIterations: number = DEFAULT_MAX_ITERATIONS): fc.Arbitrary<number> =>
  fc.integer(1, maxIterations);

export const arbitrarySeed = (): fc.Arbitrary<Seed> =>
  fc.nat().map((nextInt) => {
    let seed: Seed = {
      nextInt: () => nextInt,
      split: () => [seed, seed],
    };

    return seed;
  });

export const arbitraryPropertyConfig = (
  maxIterations: number = DEFAULT_MAX_ITERATIONS,
): fc.Arbitrary<PropertyConfig> => {
  return fc
    .tuple(arbitraryIterations(maxIterations), arbitrarySeed())
    .map(([iterations, seed]) => ({ iterations, seed }));
};

export const arbitraryDecimal = (min?: number, max?: number): fc.Arbitrary<number> =>
  fc.float(min || Number.MIN_SAFE_INTEGER, max || Number.MAX_SAFE_INTEGER).filter((x) => x.toString().includes('.'));

export const arbitrarilyShuffleArray = <T>(arr: T[]): fc.Arbitrary<T[]> => {
  return fc.array(fc.nat(), arr.length, arr.length).map((orders) =>
    arr
      .map((value, i) => ({ value: value, order: orders[i] }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.value),
  );
};
