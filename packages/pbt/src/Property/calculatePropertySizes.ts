import { pipe, repeatValue } from 'ix/iterable';
import { flatMap, take } from 'ix/iterable/operators';
import { Size } from '../Core';

const arrayRange = (n: number): number[] => [...Array(n).keys()];

export const calculatePropertySizes = (iterations: number, requestedSize?: Size): Iterable<Size> => {
  if (iterations < 0 || !Number.isInteger(iterations))
    throw new Error(`Fatal: Iterations must be positive integer, iterations = ${iterations} `);

  if (requestedSize !== undefined) {
    if (requestedSize < 0 || requestedSize > 99 || !Number.isInteger(requestedSize))
      throw new Error('Fatal: Size must integer in [0 .. 99]');

    return pipe(repeatValue(requestedSize), take(iterations));
  }

  if (iterations === 0) return [];
  if (iterations === 1) return [0];
  if (iterations <= 99) {
    const sizeIncrement = Math.floor(100 / (iterations - 1));
    return [0, ...arrayRange(iterations - 2).map((n) => sizeIncrement * (n + 1)), 99];
  }

  return pipe(
    repeatValue(null),
    flatMap(() => arrayRange(100)),
    take(iterations),
  );
};
