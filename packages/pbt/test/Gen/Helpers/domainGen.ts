import fc from 'fast-check';
import * as dev from '../../../src/Gen';

export type GenRunParams = {
  seed: dev.Seed;
  size: dev.Size;
  iterations: number;
};

export const seed = (): fc.Arbitrary<dev.Seed> => fc.nat().map(dev.Seed.create).noShrink();

export const size = (): fc.Arbitrary<dev.Size> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const iterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

export const runParams = (): fc.Arbitrary<GenRunParams> =>
  fc.tuple(seed(), size(), iterations()).map(([seed, size, iterations]) => ({ seed, size, iterations }));

export const integer = (): fc.Arbitrary<number> => fc.integer(-1000, 1000);

export const negativeInteger = (): fc.Arbitrary<number> =>
  naturalNumber()
    .filter((x) => x > 0)
    .map((x) => -x);

export const naturalNumber = (): fc.Arbitrary<number> => fc.nat(1000);

export const element = <T>(collection: Record<any, T>): fc.Arbitrary<T> => {
  const elements = Object.values(collection);
  return fc.constantFrom(...elements);
};

export type GenAndSpec<T, TSpec extends {}> = dev.Gen<T> & TSpec;
