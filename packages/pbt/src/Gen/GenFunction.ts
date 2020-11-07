/* istanbul ignore file */

import { pipe, concat, repeatValue, first } from 'ix/iterable';
import {
  map as mapIter,
  filter as filterIter,
  flatMap as flatMapIter,
  tap,
  share,
  memoize,
} from 'ix/iterable/operators';
import { takeWhileInclusive as takeWhileInclusiveIter } from '../Core/iterableOperators';
import { Rng, Size } from '../Core';
import { GenTree, GenTreeNode, CalculateComplexity } from '../GenTree';
import { Shrinker } from './Shrink';
import { Range } from './Range';

export namespace GenIteration {
  export type Instance<T> = {
    kind: 'instance';
    tree: GenTree<T>;
    seed: number;
    rng: Rng;
    nextRng: Rng;
    size: number;
    nextSize: number;
  };

  export type Discard = {
    kind: 'discard';
    value: unknown;
    predicate: Function;
    seed: number;
    rng: Rng;
    nextRng: Rng;
    size: number;
    nextSize: number;
  };

  export type Error = {
    kind: 'error';
    message: string;
    seed: number;
    rng: Rng;
    nextRng: Rng;
    size: number;
    nextSize: number;
  };

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';
  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discard | Error => !isInstance(iteration);

  export const isDiscarded = <T>(iteration: GenIteration<T>): iteration is Discard => iteration.kind === 'discard';
  export const isNotDiscarded = <T>(iteration: GenIteration<T>): iteration is Instance<T> | Error =>
    !isDiscarded(iteration);
}

export type GenIteration<T> = GenIteration.Instance<T> | GenIteration.Discard | GenIteration.Error;

export type GenFunction<T> = (rng: Rng, size: Size) => Iterable<GenIteration<T>>;

export namespace GenFunction {
  const id = <T>(x: T): T => x;

  const infinite = <T>(gen: GenFunction<T>): GenFunction<T> =>
    function* (rng, size) {
      do {
        for (const iteration of gen(rng, size)) {
          yield iteration;
          rng = iteration.nextRng;
          size = iteration.nextSize;
        }
      } while (true);
    };

  const generateInstance2 = <T>(
    f: (rng: Rng, size: Size) => [T, Rng],
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
    size: Size,
    rng: Rng,
  ): GenIteration.Instance<T> => {
    const [value, nextRng] = f(rng, size);
    return {
      kind: 'instance',
      tree: GenTree.unfold(value, id, shrink, calculateComplexity),
      seed: rng.seed,
      rng,
      nextRng,
      size,
      nextSize: size,
    };
  };

  export const create = <T>(
    f: (rng: Rng, size: Size) => [T, Rng],
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): GenFunction<T> =>
    infinite((rng: Rng, size: Size) => [generateInstance2(f, shrink, calculateComplexity, size, rng)]);

  export const error = <T>(message: string): GenFunction<T> => (rng, size) => [
    {
      kind: 'error',
      message,
      seed: rng.seed,
      rng,
      nextRng: rng,
      size,
      nextSize: size,
    },
  ];

  export const constant = <T>(value: T): GenFunction<T> => (rng, size) =>
    repeatValue<GenIteration.Instance<T>>({
      kind: 'instance',
      tree: {
        node: { value, complexity: 0 },
        shrinks: [],
      },
      seed: rng.seed,
      rng,
      nextRng: rng,
      size,
      nextSize: size,
    });

  const mapIterations = <T, U>(
    gen: GenFunction<T>,
    f: (iteration: GenIteration<T>) => GenIteration<U>,
  ): GenFunction<U> => (rng, size) => pipe(gen(rng, size), mapIter(f));

  const mapInstances = <T, U>(
    gen: GenFunction<T>,
    f: (genInstance: GenIteration.Instance<T>) => GenIteration<U>,
  ): GenFunction<U> =>
    mapIterations(gen, (genIteration) => (genIteration.kind === 'instance' ? f(genIteration) : genIteration));

  const mapTrees = <T, U>(gen: GenFunction<T>, f: (tree: GenTree<T>) => GenTree<U>): GenFunction<U> =>
    mapInstances(gen, (instance) => ({
      ...instance,
      tree: f(instance.tree),
    }));

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
  const flatMapInstanceOnce = <T, U>(
    r: GenIteration.Instance<T>,
    k: (x: T) => GenFunction<U>,
    size: Size,
  ): Iterable<GenIteration<U>> => {
    const treeFolder = function* (
      node0: GenTreeNode<T>,
      iterations: Iterable<GenIteration<U>>,
    ): Iterable<GenIteration<U>> {
      const genK = k(node0.value); // Create the array generator

      const instances0 = pipe(iterations, filterIter(GenIteration.isInstance));

      const run = (rng: Rng): Iterable<GenIteration<U>> =>
        pipe(
          genK(rng, size), // Run the array generator
          takeWhileInclusiveIter(GenIteration.isNotInstance),
          mapIter((iteration1) => {
            if (GenIteration.isNotInstance(iteration1)) return iteration1;

            // const trees0 = pipe(
            //   instances0,
            //   mapIter((instance) => instance.tree),
            // );

            const tree1 = GenTree.mapNode(iteration1.tree, (node1) => ({
              value: node1.value,
              complexity: node0.complexity + node1.complexity,
            }));

            const trees2 = pipe(
              instances0,
              flatMapIter(function* (instance): Iterable<GenTree<U>> {
                if (tree1.node.complexity === 370) {
                  const rngDiff = iteration1.nextRng.order - instance.nextRng.order;

                  if (instance.tree.node.complexity === 40) {
                    for (let i = 0; i < rngDiff; i++) {
                      console.log(instance.tree.node);

                      console.log(
                        JSON.stringify(
                          Array.from(run(rng.next())).map((i) => (i as any).tree.node),
                          null,
                          2,
                        ),
                      );

                      break;
                    }
                  }

                  // console.log({
                  //   order: instance.rng.order,
                  //   nextOrder: instance.nextRng.order,
                  //   parentOrder: iteration1.rng.order,
                  //   parentNextOrder: iteration1.nextRng.order,
                  //   rngDiff,
                  // });

                  // let currentRng = rng;
                  // for (let i = 0; i < rngCount - childRngCount; i++) {
                  //   currentRng = rng.next();
                  //   yield* pipe(
                  //     run(currentRng),
                  //     filterIter(GenIteration.isInstance),
                  //     mapIter((iteration) => iteration.tree),
                  //   );
                  // }

                  // console.log({
                  //   rngCount: Rng.range(rng, iteration1.nextRng).length,
                  //   value: tree1.node.value,
                  //   childRngCount: childRngCount,
                  //   shrunkValue: instance.tree.node.value,
                  // });

                  // for (const alternateRng of Rng.range(rng.next(), rng.next())) {
                  //   console.log(alternateRng.seed);
                  // }
                }

                yield instance.tree;
              }),
            );

            const iteration: GenIteration.Instance<U> = {
              ...iteration1,
              kind: 'instance',
              tree: GenTree.create(tree1.node, pipe(concat(trees2, tree1.shrinks))),
            };

            // console.log({
            //   node: iteration.tree.node,
            //   rng: iteration.rng.seed,
            //   nextRng: iteration.nextRng.seed,
            //   rngCount: Rng.range(iteration.rng, iteration.nextRng).length - 1,
            // });

            return iteration;
          }),
        );

      yield* run(r.nextRng);
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
        flatMapIter((genIteration) => {
          if (GenIteration.isNotInstance(genIteration)) return [genIteration];
          return flatMapInstanceOnce(genIteration, k, size);
        }),
        takeWhileInclusiveIter(GenIteration.isNotInstance),
        mapIter((iteration) => ({
          ...iteration,
          seed: rng.seed,
        })),
      ),
    );

  export const filter = <T>(gen: GenFunction<T>, f: (x: T) => boolean): GenFunction<T> =>
    infinite(function* (rng, size) {
      for (const iteration of gen(rng, size)) {
        if (iteration.kind !== 'instance') yield iteration;
        else {
          const { node, shrinks } = iteration.tree;
          if (f(node.value)) {
            yield {
              kind: 'instance',
              tree: GenTree.create(node, GenTree.filterForest(shrinks, f)),
              seed: rng.seed,
              rng,
              nextRng: iteration.nextRng,
              size,
              nextSize: size,
            };
          } else {
            yield {
              kind: 'discard',
              value: node.value,
              predicate: f,
              seed: rng.seed,
              rng,
              nextRng: rng,
              size,
              nextSize: Size.bigIncrement(size),
            };
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

  const collectNone = <T>(lengthRng: Rng, size: Size): GenIteration.Instance<T[]> => {
    return {
      kind: 'instance',
      tree: GenTree.create({ value: [], complexity: 0 }, []),
      seed: lengthRng.seed,
      rng: lengthRng,
      nextRng: lengthRng.next(),
      size,
      nextSize: size,
    };
  };

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

    const forest = instances.map((r) => r.tree);
    yield {
      kind: 'instance',
      tree: GenTree.concat(forest, range.getProportionalDistance, shrinker),
      seed: lengthRng.seed,
      rng: lengthRng,
      nextRng: instances[instances.length - 1].nextRng,
      size,
      nextSize: size,
    };
  };

  export const noShrink = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.create(tree.node, []));

  export const noComplexity = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.mapNode(tree, (node) => ({ value: node.value, complexity: 0 })));
}
