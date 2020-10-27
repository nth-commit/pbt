import { RandomStream } from '../Core';
import { GenFunction, GenIteration } from './GenFunction';
import { ScaleMode } from './Range';

export interface Gen<T> extends RandomStream<GenIteration<T>> {
  /**
   * @description The underlying function that is built up by all operations on the Gen2.
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
  ofRange(x: number, y: number, origin?: number): ArrayGen<T>;
  ofMinLength(min: number): ArrayGen<T>;
  ofMaxLength(max: number): ArrayGen<T>;
  ofLength(length: number): ArrayGen<T>;
  growsBy(scale: ScaleMode): ArrayGen<T>;
};

export type IntegerGen = Gen<number> & {
  between(min: number, max: number): IntegerGen;
  greaterThanEqual(min: number): IntegerGen;
  lessThanEqual(max: number): IntegerGen;
  origin(origin: number): IntegerGen;
  growsBy(scale: ScaleMode): IntegerGen;
};

export type GenFactory = {
  array: <T>(elementGen: Gen<T>) => ArrayGen<T>;
  integer: () => IntegerGen;
};
