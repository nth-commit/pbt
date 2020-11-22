import { GenStreamerTransformation } from './GenStream';

/**
 * Enables a GenStreamer, which may naturally terminate, to be repeated infinitely.
 */
export const repeat = <T>(): GenStreamerTransformation<T, T> => (streamer) =>
  function* (rng, size, config) {
    do {
      const stream = streamer(rng, size, config);
      for (const iteration of stream) {
        yield iteration;
        rng = iteration.nextRng;
        size = iteration.nextSize;
      }
    } while (true);
  };
