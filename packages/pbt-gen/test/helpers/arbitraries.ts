import * as fc from 'fast-check';
import * as dev from '../../src';
import * as devCore from 'pbt-core';

export const arbitrarySeed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create).noShrink();

export const arbitrarySize = (): fc.Arbitrary<devCore.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export type GenParams = {
  seed: devCore.Seed;
  size: devCore.Size;
};

export const arbitraryGenParams = (): fc.Arbitrary<GenParams> =>
  fc.tuple(arbitrarySeed(), arbitrarySize()).map(([seed, size]) => ({ seed, size }));

export const arbitraryInteger = (): fc.Arbitrary<number> => fc.integer(-1000, 1000);

export const arbitraryIterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

export const arbitraryFunction = <TReturn, TArguments extends any[]>(
  arbitrary: fc.Arbitrary<TReturn>,
): fc.Arbitrary<(...args: TArguments) => TReturn> => arbitrary.map((r) => () => r);

const generators = {
  'integer.constant': dev.integer.constant(0, 10),
  'integer.linear': dev.integer.linear(0, 10),
};

export const arbitraryGenerator = (): fc.Arbitrary<dev.Gen<unknown>> =>
  fc.constantFrom(...(Object.keys(generators) as Array<keyof typeof generators>)).map((key) => {
    const g = generators[key];
    g.toString = () => `generator:${key}`;
    return g;
  });
