import { GenTree } from '../../GenTree';
import { Shrink } from '../Shrink';
import { Range } from '../Range';
import { GenStream, GenStreamer, GenStreamerTransformation } from './GenStream';
import { Rng, Size } from '../../Core';
import { GenIteration } from '../GenIteration';
import { repeat } from './GenStreamerTransformation.Repeat';
import { GenConfig } from '../Abstractions';

export const collect = <T>(range: Range, shrinker: Shrink<GenTree<T>[]>): GenStreamerTransformation<T, T[]> => (
  streamer,
) => {
  const once: GenStreamer<T[]> = (rng, size, config) => {
    const length = rng.value(...range.getSizedBounds(size));
    if (length === 0) {
      return collectNone<T>(rng, size);
    } else {
      return collectLength<T>(streamer, shrinker, length, range, rng, size, config);
    }
  };

  return repeat<T[]>()(once);
};

const collectNone = <T>(lengthRng: Rng, size: Size): GenStream<T[]> => [
  GenIteration.instance(GenTree.create({ value: [], complexity: 0 }, []), lengthRng, lengthRng.next(), size, size),
];

const collectLength = function* <T>(
  streamer: GenStreamer<T>,
  shrinker: Shrink<GenTree<T>[]>,
  length: number,
  range: Range,
  lengthRng: Rng,
  size: Size,
  config: GenConfig,
): GenStream<T[]> {
  const initRng = lengthRng.next();

  let instances: GenIteration.Instance<T>[] = [];

  const stream = streamer(initRng, size, config);

  for (const iteration of stream) {
    if (iteration.kind !== 'instance') {
      yield iteration;
      continue;
    }

    instances = [...instances, iteration];
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
