export type RandomStream<T> = {
  run(seed: number, size: number): Iterable<T>;
};
