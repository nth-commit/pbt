import * as dev from '../srcShim';

export const mockSeed = (value: number): dev.Seed => ({
  nextInt: () => value,
  split: () => [mockSeed(value), mockSeed(value)],
  toString: () => `mockSeed(${value})`,
  valueOf: () => value,
});
