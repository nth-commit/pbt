import { Seed, Size } from '../Core';

export type RandomStream<T> = {
  run(seed: Seed, size: Size): Iterable<T>;
};
