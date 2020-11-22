import { Rng, Size } from '../Core';
import { GenStream } from './GenStream';

export type GenConfig = {};

export type Gen<T> = {
  /**
   * Creates a new generator of type T[], using the source generator to generate the elements of the array.
   */
  array(): ArrayGen<T>;

  /**
   * Creates a new generator, where the instances of the source generator are transformed by a mapper function. The
   * generator calls the mapper function for each iteration of the source generator.
   *
   * @param mapper The mapper function.
   */
  map<U>(mapper: (x: T) => U): Gen<U>;

  /**
   * Creates a new generator, which is dependent on the instances of the source generator. The generator calls the
   * mapper function for each successful iteration of the source generator, and pipes those instances into the stream
   * of the resultant generator.
   *
   * @param mapper The mapper function.
   */
  flatMap<U>(mapper: (x: T) => Gen<U>): Gen<U>;

  /**
   * Creates a new generator, whose instances have been filtered by a predicate. The generator calls the predicate for
   * each iteration of the source generator.
   *
   * @param predicate
   */
  filter(predicate: (x: T) => boolean): Gen<T>;

  /**
   * Creates a new generator, whose instances do not shrink. Useful for creating generators for data that doesn't have
   * a natural order or size.
   */
  noShrink(): Gen<T>;

  /**
   * Advanced usage only.
   *
   * Creates a new generator, whose instances do not have an associated complexity metric. The complexity metric helps
   * to inform pbt about what the smallest counterexample is, so this function essentially switches this feature off
   * for the source generator.
   */
  noComplexity(): Gen<T>;

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
  run(rng: Rng, size: Size, config?: GenConfig): GenStream<T>;
};

export type IntegerGen = Gen<number> & {
  between(min: number, max: number): IntegerGen;
  greaterThanEqual(min: number): IntegerGen;
  lessThanEqual(max: number): IntegerGen;
  origin(origin: number): IntegerGen;
  noBias(): IntegerGen;
};

export type ArrayGen<T> = Gen<T[]> & {
  betweenLengths(min: number, max: number): ArrayGen<T>;
  ofLength(length: number): ArrayGen<T>;
  ofMinLength(min: number): ArrayGen<T>;
  ofMaxLength(max: number): ArrayGen<T>;
  noBias(): ArrayGen<T>;
};

export type ElementGen<T> = Gen<T>;

export namespace ElementGen {
  export type Collection<T> = Readonly<T[] | Record<any, T> | Set<T> | Map<unknown, T>>;
}

export type GenFactory = {
  array: <T>(elementGen: Gen<T>) => ArrayGen<T>;
  integer: () => IntegerGen;
  element: <T>(collection: ElementGen.Collection<T>) => ElementGen<T>;
};
