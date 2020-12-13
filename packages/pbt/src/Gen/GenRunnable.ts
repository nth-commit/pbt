import { Rng, Size } from '../Core';
import { GenIteration } from './GenIteration';

export type GenStream<T> = Iterable<GenIteration<T>>;

export type GenConfig = {};

export type GenRunnable<T> = {
  /**
   * Advanced usage only.
   *
   * Runs the generator with the given seed and size. Using an built-in runner is the recommended pattern for receiving
   * instances from a generator. For example `sample` or `minimal`.
   *
   * @param rng The random number generator to start the generation process with.
   * @param size The size of the instances to generate. A size should be within 0-99. A larger size tells the generator
   * to produce more complex instances.
   * @param config Super advanced usage only. An optional configuration object.
   */
  run(rng: Rng, size: Size, config: GenConfig): GenStream<T>;
};

export const GenRunnable = {
  delay: <T>(f: () => GenRunnable<T>): GenRunnable<T> => ({
    run: (rng, size, config) => {
      const inner = f();
      return inner.run(rng, size, config);
    },
  }),
};
