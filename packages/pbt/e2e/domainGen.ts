import { Gen } from 'pbt';
import * as dev from '../src';

export const seed = (): Gen<number> => Gen.integer().noBias().noShrink();

export const size = (): Gen<dev.Size> => Gen.integer().noBias().between(0, 99).noShrink();
