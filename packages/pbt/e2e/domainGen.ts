import { Gen, Size } from '../src';

export const seed = (): Gen<number> => Gen.integer().growBy('constant').noShrink();

export const size = (): Gen<Size> => Gen.integer().growBy('constant').between(0, 99).noShrink();
