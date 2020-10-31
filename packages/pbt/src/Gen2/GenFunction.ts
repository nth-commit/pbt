/* istanbul ignore file */

import { of, pipe, concat, repeatValue } from 'ix/iterable';
import { map as mapIter, filter as filterIter, flatMap as flatMapIter } from 'ix/iterable/operators';
import { takeWhileInclusive as takeWhileInclusiveIter } from '../Core/iterableOperators';
import { Seed, Size } from '../Core';
import { GenTree, GenTreeNode, CalculateComplexity } from '../GenTree';
import { Shrinker } from './Shrink';
import { Range } from './Range';

export namespace GenIteration {
  export type Instance<T> = {
    kind: 'instance';
    tree: GenTree<T>;
  };

  export type Discarded = {
    kind: 'discarded';
    value: unknown;
    filteringPredicate: Function;
  };

  export type Exhausted = {
    kind: 'exhausted';
  };

  export type Error = {
    kind: 'error';
    message: string;
  };

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';
  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discarded | Exhausted | Error =>
    !isInstance(iteration);

  export const isDiscarded = <T>(iteration: GenIteration<T>): iteration is Discarded => iteration.kind === 'discarded';
  export const isNotDiscarded = <T>(iteration: GenIteration<T>): iteration is Instance<T> | Exhausted | Error =>
    !isDiscarded(iteration);
}

export type GenIteration<T> =
  | GenIteration.Instance<T>
  | GenIteration.Discarded
  | GenIteration.Exhausted
  | GenIteration.Error;

export type GenFunction<T> = (seed: Seed, size: Size) => Iterable<GenIteration<T>>;

export namespace GenFunction {
  const id = <T>(x: T): T => x;

  const generateInstance = <T>(
    f: (seed: Seed, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
    size: Size,
  ) => (seed: Seed): GenIteration.Instance<T> => ({
    kind: 'instance',
    tree: GenTree.unfold(f(seed, size), id, shrink, calculateComplexity),
  });

  export const create = <T>(
    f: (seed: Seed, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): GenFunction<T> => (seed: Seed, size: Size) =>
    pipe(Seed.stream(seed), mapIter(generateInstance(f, shrink, calculateComplexity, size)));

  export const exhausted = <T>(): GenFunction<T> => () => [{ kind: 'exhausted' }];

  export const error = <T>(message: string): GenFunction<T> => () => [{ kind: 'error', message }];

  export const constant = <T>(value: T): GenFunction<T> => () =>
    repeatValue<GenIteration.Instance<T>>({
      kind: 'instance',
      tree: {
        node: { value, complexity: 0 },
        shrinks: [],
      },
    });

  const repeat = <T>(gen: GenFunction<T>): GenFunction<T> => (seed, size) =>
    pipe(
      Seed.stream(seed),
      flatMapIter((seed0) => gen(seed0, size)),
      takeWhileInclusiveIter((iteration) => iteration.kind !== 'exhausted'),
    );

  /**
   * Like repeat, but is stingy in how many seeds it consumes. It's useful to be stingy when making comparisons about
   * generators for testing.
   * @param gen
   */
  const repeatUnobtrusive = <T>(gen: GenFunction<T>): GenFunction<T> =>
    function* (seed, size) {
      do {
        yield* gen(seed, size);
        seed = seed.split()[1];
      } while (true);
    };

  const mapIterations = <T, U>(
    gen: GenFunction<T>,
    f: (iteration: GenIteration<T>) => GenIteration<U>,
  ): GenFunction<U> => (seed, size) => pipe(gen(seed, size), mapIter(f));

  const mapInstances = <T, U>(
    gen: GenFunction<T>,
    f: (genInstance: GenIteration.Instance<T>) => GenIteration<U>,
  ): GenFunction<U> =>
    mapIterations(gen, (genIteration) => (genIteration.kind === 'instance' ? f(genIteration) : genIteration));

  const mapTrees = <T, U>(gen: GenFunction<T>, f: (tree: GenTree<T>) => GenTree<U>): GenFunction<U> =>
    mapInstances(gen, (instance) => ({
      kind: 'instance',
      tree: f(instance.tree),
    }));

  export const map = <T, U>(gen: GenFunction<T>, f: (x: T) => U): GenFunction<U> =>
    mapTrees(gen, (tree) => GenTree.map(tree, f));

  /**
   * Given a single instance, runs the gen returned by `k` until it sees another instance. Then, merges the existing
   * instance and the newly generated instance by combining their shrinks, in accordance with `k`. Produces a gen
   * that contains all intermediate non-instance values (e.g. discards or exhaustions), followed by the single
   * successfully bound instance.
   * @param r
   * @param k
   */
  const flatMapInstanceOnce = <T, U>(r: GenIteration.Instance<T>, k: (x: T) => GenFunction<U>): GenFunction<U> => (
    seed,
    size,
  ) => {
    const treeFolder = (node0: GenTreeNode<T>, iterations: Iterable<GenIteration<U>>): Iterable<GenIteration<U>> => {
      const genK = k(node0.value);

      const trees0 = pipe(
        iterations,
        filterIter(GenIteration.isInstance),
        mapIter((instance0) => instance0.tree),
      );

      return pipe(
        genK(seed, size),
        takeWhileInclusiveIter(GenIteration.isNotInstance),
        mapIter((iteration1) => {
          if (GenIteration.isNotInstance(iteration1)) return iteration1;

          const tree1 = GenTree.mapNode(iteration1.tree, (node1) => ({
            value: node1.value,
            complexity: node0.complexity + node1.complexity,
          }));

          return {
            kind: 'instance',
            tree: GenTree.create(tree1.node, concat(trees0, tree1.shrinks)),
          };
        }),
      );
    };

    const forestFolder = (iterationsOfIterations: Iterable<Iterable<GenIteration<U>>>): Iterable<GenIteration<U>> =>
      pipe(
        iterationsOfIterations,
        flatMapIter((x) => x),
      );

    return GenTree.fold<T, Iterable<GenIteration<U>>, Iterable<GenIteration<U>>>(r.tree, treeFolder, forestFolder);
  };

  /**
   * Runs the left gen until it finds and instance, then flatMaps that instance by passing it to `flatMapInstanceOnce`.
   * Produces a gen that contains all discarded instances from the left gen and the right gen, followed by the single
   * bound instance.
   * @param gen
   * @param k
   */
  const flatMapGenOnce = <T, U>(gen: GenFunction<T>, k: (x: T) => GenFunction<U>): GenFunction<U> => (seed, size) => {
    const [leftSeed, rightSeed] = seed.split();
    return pipe(
      gen(leftSeed, size),
      flatMapIter((genIteration) => {
        if (GenIteration.isNotInstance(genIteration)) return of(genIteration);
        return flatMapInstanceOnce(genIteration, k)(rightSeed, size);
      }),
      takeWhileInclusiveIter(GenIteration.isNotInstance),
    );
  };

  export const flatMap = <T, U>(gen: GenFunction<T>, k: (x: T) => GenFunction<U>): GenFunction<U> =>
    repeat(flatMapGenOnce(gen, k));

  export const filter = <T>(gen: GenFunction<T>, f: (x: T) => boolean): GenFunction<T> =>
    function* (seed, size) {
      let currentSeed = seed;
      let currentSize = size;
      while (true) {
        const [leftSeed, rightSeed] = currentSeed.split();

        for (const iteration of gen(leftSeed, currentSize)) {
          if (iteration.kind !== 'instance') yield iteration;
          else {
            const { node, shrinks } = iteration.tree;
            if (f(node.value)) {
              yield {
                kind: 'instance',
                tree: GenTree.create(node, GenTree.filterForest(shrinks, f)),
              };
            } else {
              yield {
                kind: 'discarded',
                value: node.value,
                filteringPredicate: f,
              };
              currentSize = Size.bigIncrement(currentSize);
              break;
            }
          }
        }

        currentSeed = rightSeed;
      }
    };

  const collectOne = <T>(gen: GenFunction<T>, range: Range, shrinker: Shrinker<GenTree<T>[]>): GenFunction<T[]> =>
    function* (seed, size) {
      const [leftSeed, rightSeed] = seed.split();

      const length = leftSeed.nextInt(...range.getSizedBounds(size));
      if (length === 0) {
        yield {
          kind: 'instance',
          tree: GenTree.create({ value: [], complexity: 0 }, []),
        };
      } else {
        let forest: GenTree<T>[] = [];

        for (const result of gen(rightSeed, size)) {
          switch (result.kind) {
            case 'instance':
              forest = [...forest, result.tree];
              break;
            case 'discarded':
            case 'exhausted':
            case 'error':
              yield result;
              break;
            default: {
              const n: never = result;
              throw new Error(`Expected never, received: ${n}`);
            }
          }

          if (forest.length >= length) break;
        }

        yield {
          kind: 'instance',
          tree: GenTree.concat(forest, range.getProportionalDistance, shrinker),
        };
      }
    };

  export const collect = <T>(gen: GenFunction<T>, range: Range, shrinker: Shrinker<GenTree<T>[]>): GenFunction<T[]> =>
    repeatUnobtrusive(collectOne(gen, range, shrinker));

  export const noShrink = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.create(tree.node, []));

  export const noComplexity = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.mapNode(tree, (node) => ({ value: node.value, complexity: 0 })));
}
