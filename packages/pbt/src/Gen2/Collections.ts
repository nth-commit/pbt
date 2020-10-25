import { GenFunction } from './GenFunction';
import { map, collect, noShrink, noComplexity } from './Operators';
import { integer } from './Number';
import { Range } from './Range';
import { Shrink } from './Shrink';
import { GenTree } from './Imports';

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

export const array = <T>(elementGen: GenFunction<T>, range: Range = Range.linear(0, 10)): GenFunction<T[]> =>
  collect(elementGen, range, sortAndShrinkForest(range.bounds.min));

export type Collection<T> = ReadonlyArray<T> | Readonly<Record<any, T>> | ReadonlySet<T> | ReadonlyMap<unknown, T>;

export const element = <T>(collection: Collection<T>): GenFunction<T> => {
  const elements = Array.isArray(collection)
    ? collection
    : collection instanceof Set
    ? [...collection.values()]
    : collection instanceof Map
    ? [...collection.values()]
    : Object.values(collection);

  if (elements.length === 0) return GenFunction.exhausted();

  const ixGen = integer(Range.constant(0, elements.length - 1));
  return noShrink(noComplexity(map(ixGen, (ix) => elements[ix])));
};
