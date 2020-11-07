/* istanbul ignore file */

import { pipe, concat } from 'ix/iterable';
import {
  map as mapIter,
  filter as filterIter,
  flatMap as flatMapIter,
  take as takeIter,
  expand as expandIter,
  skip as skipIter,
  tap,
} from 'ix/iterable/operators';
import { takeWhileInclusive as takeWhileInclusiveIter } from '../Core/iterableOperators';
import { Rng, Size } from '../Core';
import { GenTree, GenTreeNode } from '../GenTree';
import { GenFunction, GenIteration } from './GenFunction';

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

const flatMapTreeToIterations = <T, U>(
  leftTree: GenTree<T>,
  k: (x: T) => GenFunction<U>,
  rng: Rng,
  size: Size,
): Iterable<GenIteration<U>> => {
  const gen = k(leftTree.node.value);

  return pipe(
    gen(rng, size),
    takeWhileInclusiveIter(GenIteration.isNotInstance),
    mapIter((iteration) => {
      if (GenIteration.isNotInstance(iteration)) return iteration;

      const rightTree = GenTree.mapNode(iteration.tree, (node) => ({
        value: node.value,
        complexity: leftTree.node.complexity + node.complexity,
      }));

      const leftShrinkFlatMapped = pipe(
        leftTree.shrinks,
        flatMapIter(function* (leftTreeShrink): Iterable<GenTree<U>> {
          for (const leftTreeShrinkIteration of flatMapTreeToIterations(leftTreeShrink, k, rng, size)) {
            if (leftTreeShrinkIteration.kind === 'instance') {
              yield leftTreeShrinkIteration.tree;

              yield* pipe(
                Rng.stream(rng),
                skipIter(1),
                takeIter(iteration.nextRng.order - leftTreeShrinkIteration.nextRng.order),
                flatMapIter((altRng) => flatMapTreeToIterations(leftTreeShrink, k, altRng, size)),
                filterIter(GenIteration.isInstance),
                mapIter((iteration) => iteration.tree),
              );
            }
          }
        }),
      );

      // const leftShrinkFlatMapped2 = pipe(
      //   leftTree.shrinks,
      //   flatMapIter((leftShrink) => flatMapTreeToIterations(leftShrink, k, rng, size)),
      //   filterIter(GenIteration.isInstance),
      //   flatMapIter((flatMappedInstance) => {

      //     const alternateFlatMappedInstances = pipe(
      //       Rng.stream(rng),
      //       skipIter(1),
      //       takeIter(iteration.nextRng.order - flatMappedInstance.nextRng.order),
      //       flatMapIter((altRng) => flatMapTreeToIterations(leftTreeShrink, k, altRng, size)),
      //       filterIter(GenIteration.isInstance),
      //       mapIter((iteration) => iteration.tree),
      //     )

      //     return [flatMappedInstance.tree];
      //   }),
      // );

      return {
        ...iteration,
        kind: 'instance',
        tree: GenTree.create(rightTree.node, concat(leftShrinkFlatMapped, rightTree.shrinks)),
      };
    }),
  );
};

const flatMapInstanceOnce2 = <T, U>(
  r: GenIteration.Instance<T>,
  k: (x: T) => GenFunction<U>,
  size: Size,
): Iterable<GenIteration<U>> => {
  const gen0 = k(r.tree.node.value);

  const run = (gen: GenFunction<U>, rng: Rng): Iterable<GenIteration<U>> =>
    pipe(
      gen(rng, size),
      takeWhileInclusiveIter(GenIteration.isInstance),
      mapIter((iteration1) => {
        if (GenIteration.isNotInstance(iteration1)) return iteration1;

        const tree0 = GenTree.mapNode(iteration1.tree, (node) => ({
          value: node.value,
          complexity: r.tree.node.complexity + node.complexity,
        }));

        const shrinks1 = pipe(
          r.tree.shrinks,
          flatMapIter((shrunkTree) => {
            // if (shrunkTree.node.complexity === iteration1.tree.node.complexity) return [];
            return run(k(shrunkTree.node.value), rng);
          }),
          filterIter(GenIteration.isInstance),
          mapIter((instance) => instance.tree),
          takeIter(9),
        );

        // console.log(Array.from(r.tree.shrinks).map((t) => t.node));

        // console.log(iteration);

        return {
          ...iteration1,
          kind: 'instance',
          tree: GenTree.create(tree0.node, concat(shrinks1, tree0.shrinks)),
        };
      }),
    );

  // return run(gen0, r.nextRng);

  return flatMapTreeToIterations(r.tree, k, r.nextRng, size);
};
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
        return flatMapInstanceOnce2(genIteration, k, size);
      }),
      takeWhileInclusiveIter(GenIteration.isNotInstance),
      mapIter((iteration) => ({
        ...iteration,
        seed: rng.seed,
      })),
    ),
  );
