import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Seed, Size } from 'pbt-core';
import { create, Gen } from './Gen';
import { Shrink } from './Shrink';

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

  const clamp = (min: number, max: number, n: number): number => Math.min(max, Math.max(min, n));

  export const constant = (x: number, y: number, dp: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: () => [min, max, dp],
      origin: min,
    };
  };

  export const linear = (x: number, y: number, dp: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: (size) => {
        const sizeRatio = size / 100;
        const diff = max - min;
        const scaledMax = Math.round(diff * sizeRatio) + min;
        const clamped = clamp(min, max, scaledMax);
        return [min, clamped, dp];
      },
      origin: min,
    };
  };
}

const nextNumber = (size: Size, range: Range) => (seed: Seed): number => {
  const [min, max, maxDp] = range.getSizedBounds(size);

  /* istanbul ignore next */
  if (min > max) throw new Error('This causes the random to hang...');

  /* istanbul ignore next */
  if (maxDp === 0) {
    return seed.nextInt(min, max);
  }

  /* istanbul ignore next */
  throw new Error(`Unsupported: Number of decimal places ${maxDp}`);
};

const integral = (range: Range): Gen<number> =>
  create((seed, size) => pipe(Seed.stream(seed), map(nextNumber(size, range))), Shrink.towardsNumber(range.origin, 0));

export const integer = {
  constant: (min: number, max: number): Gen<number> => integral(Range.constant(min, max, 0)),

  linear: (min: number, max: number): Gen<number> => integral(Range.linear(min, max, 0)),
};
