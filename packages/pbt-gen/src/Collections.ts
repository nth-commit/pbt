import { Gen, create } from './Gen';
import { Range } from './Range';
import { Shrink } from './Shrink';

const arrayFromRange = <T>(range: Range, gElement: Gen<T>): Gen<T[]> =>
  create((seed, size) => {
    const [leftSeed, rightSeed] = seed.split();
    const [minLength, maxLength] = range.getSizedBounds(size);
    const length = leftSeed.nextInt(minLength, maxLength);

    const g = gElement.reduce<T[]>(length, (arr, x) => [...arr, x], []).preShrink(Shrink.array(minLength));

    return g(rightSeed, size);
  });

export const array = {
  unscaled: <T>(min: number, max: number, g: Gen<T>): Gen<T[]> => arrayFromRange(Range.constant(min, max), g),

  scaleLinearly: <T>(min: number, max: number, g: Gen<T>): Gen<T[]> => arrayFromRange(Range.linear(min, max), g),
};
