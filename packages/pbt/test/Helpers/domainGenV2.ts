import { Gen } from 'pbt-vnext';

export const anything = (): Gen<unknown> => Gen.constant({});

export const seed = (): Gen<number> => Gen.integer().growBy('constant').noShrink();

export const size = (): Gen<number> => Gen.integer().between(0, 99);
