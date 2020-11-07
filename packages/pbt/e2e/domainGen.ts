import { Gen } from 'pbt-vnext';
import * as dev from '../src';

export const seed = (): Gen<number> => Gen.integer().growBy('constant').noShrink();

export const size = (): Gen<dev.Size> => Gen.integer().growBy('constant').between(0, 99).noShrink();
