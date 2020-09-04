import { pipe, of } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { GenResult, Seed, Size } from 'pbt-core';
import { create, exhausted, Gen } from './Gen';

type Range = {
  getSizedBounds: (size: Size) => [min: number, max: number, maxDp: number];
  origin: number;
};

namespace Range {
  const sort = (x: number, y: number): [min: number, max: number] => {
    const min = x < y ? x : y;
    const max = y > x ? y : x;
    return [min, max];
  };

  export const constant = (x: number, y: number, dp: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: () => [min, max, dp],
      origin: x,
    };
  };

  export const linear = (x: number, y: number, dp: number, origin?: number): Range | string => {
    const [min, max] = sort(x, y);
    origin = origin || min;

    if (origin < min || origin > max) {
      return 'Origin was out-of-bounds';
    }

    return {
      getSizedBounds: () => [min, max, dp],
      origin,
    };
  };
}

const nextNumber = (size: Size, range: Range) => (seed: Seed): number => {
  const [min, max, maxDp] = range.getSizedBounds(size);

  /* istanbul ignore next */
  if (maxDp === 0) {
    return seed.nextInt(min, max);
  }

  /* istanbul ignore next */
  throw new Error(`Unsupported: Number of decimal places ${maxDp}`);
};

const integral = (range: Range): Gen<number> =>
  create((seed, size) => pipe(Seed.stream(seed), map(nextNumber(size, range))));

export const integer = {
  constant: (min: number, max: number): Gen<number> => integral(Range.constant(min, max, 0)),

  linear: (min: number, max: number, origin?: number): Gen<number> => {
    const maybeRange = Range.linear(min, max, 0, origin);
    return typeof maybeRange === 'string' ? exhausted() : integral(maybeRange);
  },
};
