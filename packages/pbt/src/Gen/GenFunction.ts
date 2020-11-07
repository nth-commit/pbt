/* istanbul ignore file */

import { of, pipe, concat, repeatValue } from 'ix/iterable';
import { map as mapIter, filter as filterIter, flatMap as flatMapIter } from 'ix/iterable/operators';
import { takeWhileInclusive as takeWhileInclusiveIter } from '../Core/iterableOperators';
import { Rng, Size } from '../Core';
import { GenTree, GenTreeNode, CalculateComplexity } from '../GenTree';
import { Shrinker } from './Shrink';
import { Range } from './Range';
import { GenIteration } from './GenIteration';

export type GenFunction<T> = (rng: Rng, size: Size) => Iterable<GenIteration<T>>;

export type NextIntFunction = (min: number, max: number) => number;

export type GenInstanceStatefulFunction<T> = (useNextInt: NextIntFunction, size: Size) => T;

export namespace GenFunction {
  const id = <T>(x: T): T => x;

  const infinite = <T>(gen: GenFunction<T>): GenFunction<T> =>
    function* (nextRng, nextSize) {
      do {
        for (const iteration of gen(nextRng, nextSize)) {
          yield iteration;
          nextRng = iteration.nextRng;
          nextSize = iteration.nextSize;
        }
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
    mapIterations(gen, (genIteration) => {
      return genIteration.kind === 'instance' ? f(genIteration) : genIteration;
    });

  const mapTrees = <T, U>(gen: GenFunction<T>, f: (tree: GenTree<T>) => GenTree<U>): GenFunction<U> =>
    mapInstances(gen, (instance) => ({
      ...instance,
      tree: f(instance.tree),
    }));

  export const create = <T>(
    f: GenInstanceStatefulFunction<T>,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): GenFunction<T> =>
    infinite(function* (nextRng: Rng, nextSize: Size) {
      const initRng = nextRng;
      const initSize = nextSize;

      const useNextInt: NextIntFunction = (min, max) => {
        const rngValue = nextRng.value(min, max);
        nextRng = nextRng.next();
        return rngValue;
      };

      const value = f(useNextInt, nextSize);
      yield GenIteration.instance(
        GenTree.unfold(value, id, shrink, calculateComplexity),
        initRng,
        nextRng,
        initSize,
        nextSize,
      );
    });

  export const error = <T>(message: string): GenFunction<T> => (rng, size) =>
    of(GenIteration.error(message, rng, rng, size, size));

  export const constant = <T>(value: T): GenFunction<T> => (rng, size) => {
    const tree = GenTree.create({ value, complexity: 0 }, []);
    return repeatValue(GenIteration.instance(tree, rng, rng, size, size));
  };

  export const map = <T, U>(gen: GenFunction<T>, f: (x: T) => U): GenFunction<U> =>
    mapTrees(gen, (tree) => GenTree.map(tree, f));

  /**
   * Given a single instance, runs the gen returned by `k` until it sees another instance. Then, merges the existing
   * instance and the newly generated instance by combining their shrinks, in accordance with `k`. Produces a gen
   * that contains all intermediate non-instance values (e.g. discards), followed by the single successfully bound
   * instance.
   * @param r
   * @param k
   */
  const flatMapInstanceOnce = <T, U>(r: GenIteration.Instance<T>, k: (x: T) => GenFunction<U>): GenFunction<U> => (
    rng,
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
        genK(rng, size),
        takeWhileInclusiveIter(GenIteration.isNotInstance),
        mapIter((iteration1) => {
          if (GenIteration.isNotInstance(iteration1)) return iteration1;

          const tree1 = GenTree.mapNode(iteration1.tree, (node1) => ({
            value: node1.value,
            complexity: node0.complexity + node1.complexity,
          }));

          return {
            ...iteration1,
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
   * Produces a gen that contains all discard instances from the left gen and the right gen, followed by the single
   * bound instance.
   * @param gen
   * @param k
   */
  export const flatMap = <T, U>(gen: GenFunction<T>, k: (x: T) => GenFunction<U>): GenFunction<U> =>
    infinite((rng, size) =>
      pipe(
        gen(rng, size),
        flatMapIter((iteration) => {
          if (GenIteration.isNotInstance(iteration)) return [iteration];
          return flatMapInstanceOnce(iteration, k)(rng, size);
        }),
        takeWhileInclusiveIter(GenIteration.isNotInstance),
        mapIter((iteration) => ({
          ...iteration,
          seed: rng.seed,
          initRng: rng,
          initSize: size,
        })),
      ),
    );

  export const filter = <T>(gen: GenFunction<T>, f: (x: T) => boolean): GenFunction<T> =>
    infinite(function* (rng, size) {
      for (const iteration of gen(rng, size)) {
        if (iteration.kind !== 'instance') {
          yield iteration;
        } else {
          const { node, shrinks } = iteration.tree;
          if (f(node.value)) {
            const filteredTree = GenTree.create(node, GenTree.filterForest(shrinks, f));
            yield GenIteration.instance(filteredTree, iteration.initRng, iteration.nextRng, size, size);
          } else {
            yield GenIteration.discard(
              node.value,
              f,
              iteration.initRng,
              iteration.nextRng,
              size,
              Size.bigIncrement(size),
            );
            break;
          }
        }
      }
    });

  export const collect = <T>(gen: GenFunction<T>, range: Range, shrinker: Shrinker<GenTree<T>[]>): GenFunction<T[]> =>
    infinite(function* (rng, size) {
      const length = rng.value(...range.getSizedBounds(size));
      if (length === 0) {
        yield collectNone<T>(rng, size);
      } else {
        yield* collectUntilLength<T>(gen, rng, length, size, range, shrinker);
      }
    });

  const collectNone = <T>(lengthRng: Rng, size: Size): GenIteration.Instance<T[]> =>
    GenIteration.instance(GenTree.create({ value: [], complexity: 0 }, []), lengthRng, lengthRng, size, size);

  const collectUntilLength = function* <T>(
    gen: GenFunction<T>,
    lengthRng: Rng,
    length: number,
    size: Size,
    range: Range,
    shrinker: Shrinker<GenTree<T>[]>,
  ): Iterable<GenIteration<T[]>> {
    const initRng = lengthRng.next();

    let instances: GenIteration.Instance<T>[] = [];

    for (const result of gen(initRng, size)) {
      switch (result.kind) {
        case 'instance':
          instances = [...instances, result];
          break;
        case 'discard':
        case 'error':
          yield result;
          break;
        default: {
          const n: never = result;
          throw new Error(`Expected never, received: ${n}`);
        }
      }

      if (instances.length >= length) break;
    }

    const lastInstance = instances[instances.length - 1];
    const forest = instances.map((r) => r.tree);
    yield GenIteration.instance(
      GenTree.concat(forest, range.getProportionalDistance, shrinker),
      lengthRng,
      lastInstance.nextRng,
      size,
      lastInstance.nextSize,
    );
  };
  export const noShrink = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.create(tree.node, []));

  export const noComplexity = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.mapNode(tree, (node) => ({ value: node.value, complexity: 0 })));
}
