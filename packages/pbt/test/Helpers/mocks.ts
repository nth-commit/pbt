import * as dev from '../../src';

export const mockSeed = (value: number): dev.Rng => ({
  value: () => value,
  next: () => mockSeed(value),
  seed: 0,
  family: 0,
  order: 0,
});
