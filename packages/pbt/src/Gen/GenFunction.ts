/* istanbul ignore file */

import { of, pipe, concat, repeatValue } from 'ix/iterable';
import { map as mapIter, filter as filterIter, flatMap as flatMapIter, tap } from 'ix/iterable/operators';
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
    size: number;
  };

  export type Discard = {
    kind: 'discard';
    value: unknown;
    predicate: Function;
    seed: number;
    size: number;
  };

  export type Error = {
    kind: 'error';
    message: string;
    seed: number;
    size: number;
  };

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';
  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discard | Error => !isInstance(iteration);

  export const isDiscarded = <T>(iteration: GenIteration<T>): iteration is Discard => iteration.kind === 'discard';
  export const isNotDiscarded = <T>(iteration: GenIteration<T>): iteration is Instance<T> | Error =>
    !isDiscarded(iteration);
}

export type GenIteration<T> = GenIteration.Instance<T> | GenIteration.Discard | GenIteration.Error;

export type GenFunction<T> = (rng: Rng, size: Size) => Iterable<GenIteration<T>>;

export type ResizableGenFunction<T> = (rng: Rng, size: Size) => Generator<GenIteration<T>, [Rng, Size]>;

export namespace GenFunction {
  const id = <T>(x: T): T => x;

  const generateInstance = <T>(
    f: (rng: Rng, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
    size: Size,
  ) => (rng: Rng): GenIteration.Instance<T> => ({
    kind: 'instance',
    tree: GenTree.unfold(f(rng, size), id, shrink, calculateComplexity),
    seed: rng.seed,
    size,
  });

  export const create = <T>(
    f: (rng: Rng, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): GenFunction<T> => (rng: Rng, size: Size) =>
    pipe(Rng.stream(rng), mapIter(generateInstance(f, shrink, calculateComplexity, size)));

  export const error = <T>(message: string): GenFunction<T> => (rng, size) => [
    { kind: 'error', message, seed: rng.seed, size },
  ];

  export const constant = <T>(value: T): GenFunction<T> => (rng, size) =>
    repeatValue<GenIteration.Instance<T>>({
      kind: 'instance',
      tree: {
        node: { value, complexity: 0 },
        shrinks: [],
      },
      seed: rng.seed,
      size,
    });

  const resizableRepeat = <T>(gen: ResizableGenFunction<T>): GenFunction<T> =>
    function* (rng, size) {
      do {
        const generator = gen(rng, size);
        while (true) {
          const next = generator.next();
          if (next.done) {
            rng = next.value[0];
            size = next.value[1];
            break;
          } else {
            yield next.value;
          }
        }
        rng = rng.next();
      } while (true);
    };

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
  const flatMapInstanceOnce = <T, U>(r: GenIteration.Instance<T>, k: (x: T) => GenFunction<U>): GenFunction<U> => (
    rng,
    size,
  ) => {
    console.log(`leftIteration:${Rng.create(r.seed)}`);

    const treeFolder = function* (
      node0: GenTreeNode<T>,
      iterations: Iterable<GenIteration<U>>,
    ): Iterable<GenIteration<U>> {
      const genK = k(node0.value); // Create the array generator

      const trees0 = pipe(
        iterations,
        filterIter(GenIteration.isInstance),
        mapIter((instance0) => instance0.tree),
      );

      const run = (rng: Rng): Iterable<GenIteration<U>> =>
        pipe(
          genK(rng, size), // Run the array generator
          takeWhileInclusiveIter(GenIteration.isNotInstance),
          mapIter((iteration1) => {
            console.log(`rightIteration:${Rng.create(iteration1.seed)}`);

            if (GenIteration.isNotInstance(iteration1)) return iteration1;

            // Now I know what the seed was

            const tree1 = GenTree.mapNode(iteration1.tree, (node1) => ({
              value: node1.value,
              complexity: node0.complexity + node1.complexity,
            }));

            return {
              ...iteration1,
              kind: 'instance',
              tree: GenTree.create(tree1.node, concat(trees0, tree1.shrinks)),
            };
          }),
        );

      // console.log({ initialSeed: rng.seed });

      let lastRng = Rng.create(rng.seed);
      yield* pipe(
        run(rng),
        tap((iteration) => {
          lastRng = Rng.create(iteration.seed);
        }),
      );

      console.log({ lastSeed: lastRng.toString() });

      // let breaker = 0;
      // let currentSeed = rng.seed;

      // while (true) {
      //   breaker++;
      //   if (breaker > 20) {
      //     throw 'breaker';
      //   }

      //   // console.log({ currentSeed });
      //   if (currentSeed === initialRng.seed) {
      //     break;
      //   }

      //   const nextRng = rng.next();
      //   yield* run(nextRng);
      //   currentSeed = nextRng.seed;
      // }
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
    resizableRepeat(function* (rng, size) {
      const nextRng = rng.next();
      // console.log({ flatMapInitSeed: rng.seed, flatMapNextSeed: nextRng.seed });
      yield* pipe(
        gen(rng, size),
        flatMapIter((genIteration) => {
          if (GenIteration.isNotInstance(genIteration)) return of(genIteration);
          return flatMapInstanceOnce(genIteration, k)(nextRng, size);
        }),
        takeWhileInclusiveIter(GenIteration.isNotInstance),
        mapIter((iteration) => ({
          ...iteration,
          seed: rng.seed,
        })),
      );
      return [nextRng, size];
    });

  export const filter = <T>(gen: GenFunction<T>, f: (x: T) => boolean): GenFunction<T> =>
    resizableRepeat(function* (rng, size) {
      for (const iteration of gen(rng, size)) {
        if (iteration.kind !== 'instance') yield iteration;
        else {
          const { node, shrinks } = iteration.tree;
          if (f(node.value)) {
            yield {
              kind: 'instance',
              tree: GenTree.create(node, GenTree.filterForest(shrinks, f)),
              seed: rng.seed,
              size,
            };
          } else {
            yield {
              kind: 'discard',
              value: node.value,
              predicate: f,
              seed: rng.seed,
              size,
            };
            return [rng, Size.bigIncrement(size)];
          }
        }
      }
      return [rng, size];
    });

  export const collect = <T>(gen: GenFunction<T>, range: Range, shrinker: Shrinker<GenTree<T>[]>): GenFunction<T[]> =>
    resizableRepeat(function* (rng, size) {
      const nextRng = rng.next();

      const length = rng.value(...range.getSizedBounds(size));
      if (length === 0) {
        yield {
          kind: 'instance',
          tree: GenTree.create({ value: [], complexity: 0 }, []),
          seed: rng.seed,
          size,
        };
      } else {
        let forest: GenTree<T>[] = [];

        for (const result of gen(nextRng, size)) {
          switch (result.kind) {
            case 'instance':
              forest = [...forest, result.tree];
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

          if (forest.length >= length) break;
        }

        yield {
          kind: 'instance',
          tree: GenTree.concat(forest, range.getProportionalDistance, shrinker),
          seed: rng.seed,
          size,
        };
      }

      return [nextRng, size];
    });

  export const noShrink = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.create(tree.node, []));

  export const noComplexity = <T>(gen: GenFunction<T>): GenFunction<T> =>
    mapTrees(gen, (tree) => GenTree.mapNode(tree, (node) => ({ value: node.value, complexity: 0 })));
}
