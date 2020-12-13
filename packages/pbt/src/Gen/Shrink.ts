import { concat, empty, generate, of, pipe } from 'ix/iterable';
import { flatMap, map, skip } from 'ix/iterable/operators';
import { indexed } from '../Core/iterableOperators';
import { Calculator, NATIVE_CALCULATOR } from '../Number';

export type Shrink<T> = (value: T) => Iterable<T>;

export namespace Shrink {
  const halves = <TIntegral>(calculator: Calculator<TIntegral>, value: TIntegral): Iterable<TIntegral> => {
    const sign = calculator.sign(value);
    const absValue = calculator.abs(value);
    const end = calculator.lessThan(absValue, calculator.one) ? empty() : of(calculator.one);
    const two = calculator.add(calculator.one, calculator.one);

    return pipe(
      concat(
        generate(
          absValue,
          (x) => calculator.greaterThan(x, calculator.one),
          (x) => calculator.round(calculator.div(x, two), calculator.zero),
          (x) => x,
        ),
        end,
      ),
      map((x) => {
        switch (sign) {
          case -1:
            return calculator.negate(x);
          case 1:
            return x;
          /*istanbul ignore next */
          case 0:
            return calculator.zero;
        }
      }),
    );
  };

  export const towardsNumber = <TIntegral>(calculator: Calculator<TIntegral>, target: TIntegral): Shrink<TIntegral> => (
    value,
  ) =>
    pipe(
      halves(calculator, calculator.sub(value, target)),
      map((x) => calculator.sub(value, x)),
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

  const arrayUnsorted = <T>(targetLength: number): Shrink<T[]> => (arr) => {
    const { length } = arr;

    const shrunkLengths = pipe(
      halves(NATIVE_CALCULATOR, length - targetLength),
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
  export const array = <T>(minLength: number, order?: (x: T) => number): Shrink<T[]> => {
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

  /* istanbul ignore next */
  export const none = <T>(): Shrink<T> => empty;
}
