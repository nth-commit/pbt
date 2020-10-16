import { Seed, Size } from './Imports';
import { GenFunction } from './GenFunction';
import { Range } from './Range';
import { Shrink } from './Shrink';

const nextNumber = (size: Size, range: Range, seed: Seed): number => {
  const { min, max } = range.getSizedBounds(size);
  return seed.nextInt(min, max);
};

const MAX_INT_32 = Math.pow(2, 31) - 1;
const MIN_INT_32 = -MAX_INT_32;

export const integer = (range: Range = Range.linearFrom(0, MIN_INT_32, MAX_INT_32)): GenFunction<number> =>
  GenFunction.create(
    (seed, size) => nextNumber(size, range, seed),
    Shrink.towardsNumber(range.origin),
    range.calculateComplexity,
  );

export const naturalNumber = (max: number = MAX_INT_32): GenFunction<number> => integer(Range.linear(0, max));
