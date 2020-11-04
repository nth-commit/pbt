import { concat, empty, generate, of, pipe } from 'ix/iterable';
import { flatMap, map, skip } from 'ix/iterable/operators';
import { indexed } from '../Core/iterableOperators';

export type Shrinker<T> = (value: T) => Iterable<T>;

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

  export const towardsNumber = (target: number): Shrinker<number> => (value) =>
    pipe(
      halves(value - target),
      map((x) => value - x),
    );

  export const combinations = <T>(k0: number): Shrinker<T[]> => (arr0) => {
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

  const arrayUnsorted = <T>(targetLength: number): Shrinker<T[]> => (arr) => {
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

  const numberArrayEquals = (xs: number[], ys: number[]): boolean =>
    xs.length === ys.length && xs.every((x, i) => x === ys[i]);

  /**
   * Shrinks an array by edging towards the smallest possible array towards the given value. Shrinks via three passes.
   * The first pass sorts the array by the optionally provided order function. The purpose of this pass is to all the
   * shrink to normalize to a certain result. The second pass simply drops elements from the end of the original array.
   * The third pass generates arrays of the same lengths, but will attempt all possible combinations at each length.
   */
  export const array = <T>(minLength: number, order?: (x: T) => number): Shrinker<T[]> => {
    const innerShrink = arrayUnsorted<T>(minLength);
    return (arr) => {
      if (!order) {
        return innerShrink(arr);
      }

      const orderByIndex = new Map<number, number>(arr.map((x, i) => [i, order(x)]));
      const initialOrder = arr.map((_, index) => index);
      const sortedOrder = arr
        .map((_, index) => ({ index, order: orderByIndex.get(index)! }))
        .sort((a, b) => a.order - b.order)
        .map((a) => a.index);
      if (numberArrayEquals(initialOrder, sortedOrder)) {
        return innerShrink(arr);
      }

      const sortedArr = sortedOrder.map((index) => arr[index]);
      return concat([sortedArr], innerShrink(sortedArr), innerShrink(arr));
    };
  };

  export const elements = <T>(shrinker: Shrinker<T>): Shrinker<T[]> => (arr) => {
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

  /* istanbul ignore next */
  export const none = <T>(): Shrinker<T> => empty;
}
