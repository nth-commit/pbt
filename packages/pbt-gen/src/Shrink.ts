import { pipe, generate, concat, of, empty } from 'ix/iterable';
import { flatMap, map, skip } from 'ix/iterable/operators';
import { indexed } from './iterableOperators';

export type Shrink<T> = (value: T) => Iterable<T>;

export namespace Shrink {
  const halves = (value: number): Iterable<number> => {
    const sign = Math.sign(value);
    const absValue = Math.abs(value);
    const end = absValue < 1 ? empty() : of(1);

    return pipe(
      concat(
        generate(
          absValue,
          (x) => x > 1,
          (x) => Math.round(x / 2),
          (x) => x,
        ),
        end,
      ),
      map((x) => x * sign),
    );
  };

  export const towardsNumber = (target: number): Shrink<number> => (value) =>
    pipe(
      halves(value - target),
      map((x) => value - x),
    );

  export const combinations = <T>(k0: number): Shrink<T[]> => (arr0) => {
    const headCombinations = function* (k: number, arr: T[]): Iterable<T[]> {
      const [head, ...tail] = arr;

      yield* pipe(
        allCombinations(k - 1, tail),
        map((tailCombinations) => [head, ...tailCombinations]),
      );
    };

    const allCombinations = function* (k: number, arr: T[]): Iterable<T[]> {
      if (k === 1) yield* arr.map((x) => [x]);
      else {
        const n = arr.length;
        for (let i = 0; i < n; i++) {
          yield* headCombinations(k, arr.slice(i));
        }
      }
    };

    if (k0 === arr0.length) return empty();
    if (k0 === 0) return empty();
    return allCombinations(k0, arr0);
  };

  /**
   * Shrinks an array by edging from the smallest possible array towards the given value. Shrinks via two passes. The
   * first pass simply drops elements from the end of the original array. The second pass generates arrays of the
   * same lengths, but will attempt all possible combinations at each length.
   */
  export const array = <T>(targetLength: number): Shrink<T[]> => (arr) => {
    const { length } = arr;

    const shrunkLengths = pipe(
      halves(length - targetLength),
      map((dropCount) => length - dropCount),
    );

    return concat<T[], T[]>(
      pipe(
        shrunkLengths,
        map((l) => arr.slice(0, l)),
      ),
      pipe(
        shrunkLengths,
        flatMap((l) =>
          pipe(
            combinations<T>(l)(arr),
            skip(1), // Already have this combination from the first pass
          ),
        ),
      ),
    );
  };

  export const elements = <T>(shrinker: Shrink<T>): Shrink<T[]> => (arr) => {
    if (arr.length === 0) return empty();

    return pipe(
      arr,
      indexed(),
      flatMap(({ value, index }) =>
        pipe(
          shrinker(value),
          map((x) => [...arr.slice(0, index), x, ...arr.slice(index + 1)]),
        ),
      ),
    );
  };

  export const none = <T>(): Shrink<T> => empty;
}
