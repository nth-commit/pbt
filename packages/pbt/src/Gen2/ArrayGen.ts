import { GenTree } from '../GenTree';
import { GenFunction } from './GenFunction';
import { ScaleMode, Range } from './Range';
import { Shrink } from './Shrink';
import { Gen, ArrayGen, GenFactory } from './Abstractions';
import { BaseGen } from './BaseGen';

type ArrayGenImplArgs<T> = Readonly<{
  gen: Gen<T>;
  min: number;
  max: number;
  scale: ScaleMode;
}>;

export const array = <T>(elementGen: Gen<T>, genFactory: GenFactory): ArrayGen<T> => {
  class ArrayGenImpl<T> extends BaseGen<T[]> implements ArrayGen<T> {
    constructor(private args: ArrayGenImplArgs<T>) {
      super((seed, size) => {
        const { gen, min, max, scale } = this.args;
        const range = Range.createRange(min, max, null, scale);
        return arrayFunction(gen.genFunction, range)(seed, size);
      }, genFactory);
    }

    ofRange(min: number, max: number): ArrayGen<T> {
      return new ArrayGenImpl({
        ...this.args,
        min,
        max,
      });
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

    growsBy(scale: ScaleMode): ArrayGen<T> {
      return new ArrayGenImpl({
        ...this.args,
        scale,
      });
    }
  }

  return new ArrayGenImpl<T>({
    gen: elementGen,
    min: 0,
    max: 10,
    scale: 'linear',
  });
};

const arrayFunction = <T>(elementGen: GenFunction<T>, range: Range): GenFunction<T[]> =>
  GenFunction.collect(elementGen, range, sortAndShrinkForest(range.bounds.min));

// TODO: Move into standard array shrinker, it makes debugging easier if we can build the same tree that we get out of the Gen
const sortAndShrinkForest = <T>(minLength: number) => {
  const shrinkForest = Shrink.array<GenTree<T>>(minLength);

  return function* (forest: GenTree<T>[]): Iterable<GenTree<T>[]> {
    const sortedForest = sortForestByComplexity(forest);
    const complexities = forest.map((tree) => tree.node.complexity);
    const sortedComplexities = sortedForest.map((tree) => tree.node.complexity);

    if (!numberArrayEquals(complexities, sortedComplexities)) {
      yield sortedForest;
      yield* shrinkForest(sortedForest);
    } else {
      yield* shrinkForest(forest);
    }
  };
};

const numberArrayEquals = (xs: number[], ys: number[]): boolean =>
  xs.length === ys.length && xs.every((x, i) => x === ys[i]);

const sortForestByComplexity = <T>(forest: GenTree<T>[]): GenTree<T>[] =>
  [...forest].sort((a, b) =>
    Array.isArray(a.node.value)
      ? // If the node value is an array, that is, we are building an "array of arrays", it is "less complex" to
        // order the inner arrays by descending length. It also lets us find the minimal shrink a lot more efficiently
        // in some examples, e.g.: https://github.com/jlink/shrinking-challenge/blob/main/challenges/large_union_list.md
        b.node.complexity - a.node.complexity
      : // Else, sort the elements in ascending order of complexity (smallest first).
        a.node.complexity - b.node.complexity,
  );
