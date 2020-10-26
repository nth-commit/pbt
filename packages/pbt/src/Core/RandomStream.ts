import { Seed } from './Seed';

export type RandomStream<T> = {
  run(seed: number | Seed, size: number): Iterable<T>;
};
