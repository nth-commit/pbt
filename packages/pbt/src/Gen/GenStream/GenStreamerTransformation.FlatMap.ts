import { pipe as pipeIter, concat as concatIter } from 'ix/iterable';
import {
  map as mapIter,
  filter as filterIter,
  flatMap as flatMapIter,
  take as takeIter,
  skip as skipIter,
} from 'ix/iterable/operators';
import { takeWhileInclusive as takeWhileInclusiveIter } from '../../Core/iterableOperators';
import { Rng, Size } from '../../Core';
import { GenTree } from '../../GenTree';
import { GenIteration } from '../GenIteration';
import { GenStream, GenStreamer, GenStreamerTransformation } from './GenStream';
import { GenConfig } from '../Abstractions';

export const flatMap = <T, U>(mapper: (x: T) => GenStreamer<U>): GenStreamerTransformation<T, U> => (streamer) =>
  function* (rng, size, config) {
    const stream = streamer(rng, size, config);
    for (const iteration of stream) {
      if (iteration.kind !== 'instance') {
        yield iteration;
        continue;
      }

      const innerStream = flatMapTreeToIterations(iteration.tree, mapper, iteration.nextRng, size, config);
      for (const innerIteration of innerStream) {
        const innerIterationMutated: GenIteration<U> = {
          ...innerIteration,
          initRng: rng,
          initSize: size,
        };

        yield innerIterationMutated;
      }
    }
  };

const flatMapTreeToIterations = <T, U>(
  leftTree: GenTree<T>,
  mapper: (x: T) => GenStreamer<U>,
  rng: Rng,
  size: Size,
  config: GenConfig,
): GenStream<U> => {
  const streamer = mapper(leftTree.node.value);

  return pipeIter(
    streamer(rng, size, config),
    takeWhileInclusiveIter(GenIteration.isNotInstance),
    mapIter((iteration) => {
      if (GenIteration.isNotInstance(iteration)) return iteration;

      const rightTree = GenTree.mapNode(iteration.tree, (node) => ({
        value: node.value,
        complexity: leftTree.node.complexity + node.complexity,
      }));

      const leftShrinkFlatMapped = pipeIter(
        leftTree.shrinks,
        flatMapIter(function* (leftTreeShrink): Iterable<GenTree<U>> {
          for (const leftTreeShrinkIteration of flatMapTreeToIterations(leftTreeShrink, mapper, rng, size, config)) {
            if (leftTreeShrinkIteration.kind === 'instance') {
              yield leftTreeShrinkIteration.tree;

              yield* pipeIter(
                Rng.stream(rng),
                skipIter(1),
                takeIter(iteration.nextRng.order - leftTreeShrinkIteration.nextRng.order),
                flatMapIter((altRng) => flatMapTreeToIterations(leftTreeShrink, mapper, altRng, size, config)),
                filterIter(GenIteration.isInstance),
                mapIter((iteration) => iteration.tree),
              );
            }
          }
        }),
      );

      return {
        ...iteration,
        kind: 'instance',
        tree: GenTree.create(rightTree.node, concatIter(leftShrinkFlatMapped, rightTree.shrinks)),
      };
    }),
  );
};
