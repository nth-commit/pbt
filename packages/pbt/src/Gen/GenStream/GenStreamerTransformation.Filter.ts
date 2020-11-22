import { GenTree } from '../../GenTree';
import { GenIteration } from '../GenIteration';
import { GenStreamerTransformation } from './GenStream';
import { repeat } from './GenStreamerTransformation.Repeat';

export const filter = <T>(predicate: (x: T) => boolean): GenStreamerTransformation<T, T> => (streamer) =>
  repeat<T>()(function* (rng, size, config) {
    let consecutiveDiscards = 0;

    const stream = streamer(rng, size, config);

    for (const iteration of stream) {
      if (iteration.kind !== 'instance') {
        yield iteration;
        continue;
      }

      const { node, shrinks } = iteration.tree;
      if (predicate(node.value)) {
        const filteredTree = GenTree.create(
          node,
          GenTree.filterForest(shrinks, (x) => predicate(x)),
        );
        yield GenIteration.instance(
          filteredTree,
          iteration.initRng,
          iteration.nextRng,
          iteration.initSize,
          iteration.nextSize,
        );
        consecutiveDiscards = 0;
        continue;
      }

      consecutiveDiscards++;
      if (consecutiveDiscards > 10) {
        yield GenIteration.discard(
          node.value,
          predicate,
          iteration.initRng,
          iteration.nextRng,
          iteration.initSize,
          Math.min(iteration.nextSize + 10, 99),
        );
        consecutiveDiscards = 0;
        break;
      } else {
        yield GenIteration.discard(
          node.value,
          predicate,
          iteration.initRng,
          iteration.nextRng,
          iteration.initSize,
          iteration.nextSize,
        );
        continue;
      }
    }
  });
