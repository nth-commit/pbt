import { Rng, Size } from '../../Core';
import { GenTree } from '../../GenTree';
import { GenConfig } from '../Abstractions';
import { GenIteration } from '../GenIteration';
import { Shrink } from '../Shrink';

export type GenStream<T> = Iterable<GenIteration<T>>;

export type GenStreamer<T> = (rng: Rng, size: Size, config: GenConfig) => GenStream<T>;

export type NextIntFunction = (min: number, max: number) => number;

export type StatefulGenFunction<T> = (useNextInt: NextIntFunction, size: Size) => T;

export const GenStreamer = {
  create: <T>(
    statefulGenFunction: StatefulGenFunction<T>,
    shrink: Shrink<T>,
    calculateComplexity: GenTree.CalculateComplexity<T>,
  ): GenStreamer<T> =>
    function* (nextRng: Rng, nextSize: Size) {
      const initRng = nextRng;
      const initSize = nextSize;

      const useNextInt: NextIntFunction = (min, max) => {
        const rngValue = nextRng.value(min, max);
        nextRng = nextRng.next();
        return rngValue;
      };

      const value = statefulGenFunction(useNextInt, nextSize);
      yield GenIteration.instance(
        GenTree.unfold(value, (x) => x, shrink, calculateComplexity),
        initRng,
        nextRng,
        initSize,
        nextSize,
      );
    },

  error: <T>(message: string): GenStreamer<T> => (rng, size) => [GenIteration.error(message, rng, rng, size, size)],

  constant: <T>(value: T): GenStreamer<T> => (rng, size) => [
    GenIteration.instance(GenTree.create({ value, complexity: 0 }, []), rng, rng, size, size),
  ],
};

export type GenStreamerTransformation<T, U> = (streamer: GenStreamer<T>) => GenStreamer<U>;
