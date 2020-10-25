import { Seed, Size } from '../srcShim';

export type RunParams = {
  seed: number | Seed;
  size: Size;
  iterations: number;
};
