import { GenTree } from '../GenTree';
import { GenFunction } from './GenFunction';
import { ScaleMode, Range } from './Range';
import { Shrink } from './Shrink';
import { Gen, ArrayGen, GenFactory } from './Abstractions';
import { BaseGen } from './BaseGen';

type ArrayGenArgs<T> = Readonly<{
  gen: Gen<T>;
  min: number | null;
  max: number | null;
  scale: ScaleMode | null;
}>;

export const array = <T>(elementGen: Gen<T>, genFactory: GenFactory): ArrayGen<T> => {
  class ArrayGenImpl<T> extends BaseGen<T[]> implements ArrayGen<T> {
    constructor(private args: ArrayGenArgs<T>) {
      super((seed, size) => arrayFunction(args)(seed, size), genFactory);
    }

    betweenLengths(min: number, max: number): ArrayGen<T> {
      return new ArrayGenImpl({
        ...this.args,
        min,
        max,
      });
    }

    ofLength(length: number): ArrayGen<T> {
      return this.betweenLengths(length, length);
    }

    ofMinLength(min: number): ArrayGen<T> {
      return new ArrayGenImpl({
        ...this.args,
        min,
      });
    }

    ofMaxLength(max: number): ArrayGen<T> {
      return new ArrayGenImpl({
        ...this.args,
        max,
      });
    }

    growBy(scale: ScaleMode): ArrayGen<T> {
      return new ArrayGenImpl({
        ...this.args,
        scale,
      });
    }
  }

  return new ArrayGenImpl<T>({ gen: elementGen, min: null, max: null, scale: null });
};

const arrayFunction = <T>(args: ArrayGenArgs<T>): GenFunction<T[]> => {
  const min = tryDeriveMin(args.min);
  if (typeof min === 'string') return GenFunction.error(min);

  const max = tryDeriveMax(args.max);
  if (typeof max === 'string') return GenFunction.error(max);

  const { gen, scale } = args;
  const range = Range.createFrom(min, max, Math.min(min, max), scale || 'linear');
  return GenFunction.collect(gen.genFunction, range, Shrink.array(range.origin, getOrderOfTree));
};

const tryDeriveMin = (min: number | null): number | string => {
  if (min === null) return 0;
  if (!Number.isInteger(min)) return `Minimum must be an integer, min = ${min}`;
  if (min < 0) return `Minimum must be at least 0, min = ${min}`;
  return min;
};

const tryDeriveMax = (max: number | null): number | string => {
  if (max === null) return 10;
  if (!Number.isInteger(max)) return `Maximum must be an integer, min = ${max}`;
  if (max < 0) return `Maximum must be at least 0, min = ${max}`;
  return max;
};

/* istanbul ignore next */
const getOrderOfTree = <T>(tree: GenTree<T>): number =>
  Array.isArray(tree.node.value)
    ? // If the node value is an array, that is, we are building an "array of arrays", it is "less complex" to
      // order the inner arrays by descending length. It also lets us find the minimal shrink a lot more efficiently
      // in some examples, e.g.: https://github.com/jlink/shrinking-challenge/blob/main/challenges/large_union_list.md
      -tree.node.complexity
    : // Else, sort the elements in ascending order of complexity (smallest first).
      tree.node.complexity;
