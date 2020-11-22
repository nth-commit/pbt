import { GenIteration } from '../GenIteration';
import { GenStreamerTransformation } from './GenStream';

export const transformInstances = <T, U>(
  transformInstance: (instance: GenIteration.Instance<T>) => GenIteration<U>,
): GenStreamerTransformation<T, U> => (streamer) =>
  function* (rng, size, config) {
    const stream = streamer(rng, size, config);
    for (const iteration of stream) {
      if (iteration.kind !== 'instance') {
        yield iteration;
        continue;
      }

      yield transformInstance(iteration);
    }
  };
