import fc from 'fast-check';
import * as dev from '../../src';

export const arbitrarySeed = (): fc.Arbitrary<dev.Seed> => fc.nat().map(dev.Seed.create).noShrink();

export const arbitrarySize = (): fc.Arbitrary<dev.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));
