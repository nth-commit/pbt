import { RandomStream, Rng } from '../Core';
import { GenFunction } from './GenFunction';
import { GenIteration } from './GenIteration';
import { ScaleMode } from './Range';

export type GenConfig = Partial<{
  makeRng: (seed: number) => Rng;
}>;

export interface Gen<T> extends RandomStream<GenIteration<T>, GenConfig> {
  /**
   * @description The underlying function that is built up by all operations on a Gen.
   * @private
   */
  readonly genFunction: GenFunction<T>;
  array(): ArrayGen<T>;
  map<U>(f: (x: T) => U): Gen<U>;
  flatMap<U>(k: (x: T) => Gen<U>): Gen<U>;
  filter(predicate: (x: T) => boolean): Gen<T>;
  noShrink(): Gen<T>;
  noComplexity(): Gen<T>;
}

export type ArrayGen<T> = Gen<T[]> & {
  betweenLengths(min: number, max: number): ArrayGen<T>;
  ofLength(length: number): ArrayGen<T>;
  ofMinLength(min: number): ArrayGen<T>;
  ofMaxLength(max: number): ArrayGen<T>;
  growBy(scale: ScaleMode): ArrayGen<T>;
};

export type IntegerGen = Gen<number> & {
  between(min: number, max: number): IntegerGen;
  greaterThanEqual(min: number): IntegerGen;
  lessThanEqual(max: number): IntegerGen;
  origin(origin: number): IntegerGen;
  growBy(scale: ScaleMode): IntegerGen;
};

export type GenFactory = {
  array: <T>(elementGen: Gen<T>) => ArrayGen<T>;
  integer: () => IntegerGen;
};
