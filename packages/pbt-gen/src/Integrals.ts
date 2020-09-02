import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Seed, Size } from 'pbt-core';
import { create, Gen } from './Gen';

type Range = {
  getSizedBounds: (size: Size) => [min: number, max: number, maxDp: number];
  origin: number;
};

namespace Range {
  export const constant = (min: number, max: number, dp: number): Range => ({
    getSizedBounds: () => {
      const actualMin = min < max ? min : max;
      const actualMax = max > min ? max : min;
      return [actualMin, actualMax, dp];
    },
    origin: min,
  });
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
};
