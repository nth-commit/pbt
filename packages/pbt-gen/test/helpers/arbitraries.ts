import * as fc from 'fast-check';
import { map } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import { Seed } from 'pbt-core';

const toIterator = function* <T>(iterable: Iterable<T>): Iterator<T> {
  for (const x of iterable) {
    yield x;
  }
};

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
  outputGen: (s: devCore.Seed) => TReturn,
): fc.Arbitrary<(...args: TArguments) => TReturn> => {
  return arbitrarySeed().map((s) => {
    const iterator = toIterator(map<Seed, TReturn>(outputGen)(devCore.Seed.stream(s)));
    return () => {
      const { value, done } = iterator.next();
      if (done) throw 'Fatal: Iterator completed';
      return value;
    };
  });
};
