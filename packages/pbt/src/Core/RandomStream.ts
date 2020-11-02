import { Seed } from './Seed';

export type RandomStream<T, TConfig = never> = {
  run(seed: number | Seed, size: number, config?: TConfig): Iterable<T>;
};
