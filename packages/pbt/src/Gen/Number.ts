import { Seed, Size } from './Imports';
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

const maxInt32 = Math.pow(2, 31) - 1;

export const naturalNumber = {
  unscaled: (max: number = maxInt32) => integer.unscaled(0, max),
  scaleLinearly: (max: number = maxInt32) => integer.scaleLinearly(0, max),
};
