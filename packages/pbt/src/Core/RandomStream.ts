export type RandomStream<T, TConfig = never> = {
  run(seed: number, size: number, config?: TConfig): Iterable<T>;
};
