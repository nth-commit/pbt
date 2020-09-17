import { Seed, Size } from 'pbt-core';
import { Gen, create } from './Gen';
import { Shrink } from './Shrink';

type Range = {
  getSizedBounds: (size: Size) => [min: number, max: number];
  origin: number;
};

namespace Range {
  const sort = (x: number, y: number): [min: number, max: number] => {
    const min = x < y ? x : y;
    const max = y > x ? y : x;
    return [min, max];
  };

  const clamp = (min: number, max: number, n: number): number => Math.min(max, Math.max(min, n));

  export const constant = (x: number, y: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: () => [min, max],
      origin: min,
    };
  };

  export const linear = (x: number, y: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: (size) => {
        const sizeRatio = size / 100;
        const diff = max - min;
        const scaledMax = Math.round(diff * sizeRatio) + min;
        const clamped = clamp(min, max, scaledMax);
        return [min, clamped];
      },
      origin: min,
    };
  };
}

const nextNumber = (size: Size, range: Range, seed: Seed): number => seed.nextInt(...range.getSizedBounds(size));

const integral = (range: Range): Gen<number> =>
  create((seed, size) => nextNumber(size, range, seed), Shrink.towardsNumber(range.origin));

export const integer = {
  unscaled: (min: number, max: number): Gen<number> => integral(Range.constant(min, max)),

  scaleLinearly: (min: number, max: number): Gen<number> => integral(Range.linear(min, max)),
};

export const naturalNumber = {
  unscaled: (max: number = Number.MAX_SAFE_INTEGER) => integer.unscaled(0, max),

  scaleLinearly: (max: number = Number.MAX_SAFE_INTEGER) => integer.scaleLinearly(0, max),
};
