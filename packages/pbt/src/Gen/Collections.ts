import { Gen, constant } from './Gen';
import { operators } from './Operators';
import { integer } from './Number';
import { Shrink } from './Shrink';

const arrayFromInteger = <T>(minLength: number, lengthGen: Gen<number>, elementGen: Gen<T>): Gen<T[]> =>
  operators.flatMap(operators.noShrink(lengthGen), (length) => {
    if (length === 0) {
      return constant([]);
    }

    return operators.postShrink(
      operators.reduce<T, T[]>(elementGen, length, (arr, x) => [...arr, x], []),
      Shrink.array(minLength),
    );
  });

export const array = {
  unscaled: <T>(min: number, max: number, g: Gen<T>): Gen<T[]> => arrayFromInteger(min, integer.unscaled(min, max), g),
  scaleLinearly: <T>(min: number, max: number, g: Gen<T>): Gen<T[]> =>
    arrayFromInteger(min, integer.scaleLinearly(min, max), g),
};
