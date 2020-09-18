import { Seed, Size } from 'pbt-core';
import { Gen, create } from './Gen';
import { Range } from './Range';
import { Shrink } from './Shrink';

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
