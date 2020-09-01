import * as fc from 'fast-check';
import * as devCore from 'pbt-core';

export const arbitrarySeed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create);

export const arbitrarySize = (): fc.Arbitrary<devCore.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export type GenParams = {
  seed: devCore.Seed;
  size: devCore.Size;
};

export const arbitraryGenParams = (): fc.Arbitrary<GenParams> =>
  fc.tuple(arbitrarySeed(), arbitrarySize()).map(([seed, size]) => ({ seed, size }));

export const arbitraryIterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

export const arbitraryFunction = <TReturn, TArguments extends any[]>(
  arbitrary: fc.Arbitrary<TReturn>,
): fc.Arbitrary<(...args: TArguments) => TReturn> => arbitrary.map((r) => () => r);
