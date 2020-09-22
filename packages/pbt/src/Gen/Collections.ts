import { Gen, constant, exhausted } from './Gen';
import { map, flatMap, reduce, noShrink, postShrink } from './Operators';
import { integer } from './Number';
import { Shrink } from './Shrink';

const arrayFromInteger = <T>(minLength: number, lengthGen: Gen<number>, elementGen: Gen<T>): Gen<T[]> =>
  flatMap(noShrink(lengthGen), (length) => {
    if (length === 0) {
      return constant([]);
    }

    return postShrink(
      reduce<T, T[]>(elementGen, length, (arr, x) => [...arr, x], []),
      Shrink.array(minLength),
    );
  });

export const array = {
  unscaled: <T>(min: number, max: number, g: Gen<T>): Gen<T[]> => arrayFromInteger(min, integer.unscaled(min, max), g),
  scaleLinearly: <T>(min: number, max: number, g: Gen<T>): Gen<T[]> =>
    arrayFromInteger(min, integer.scaleLinearly(min, max), g),
};

export const element = <T>(
  collection: ReadonlyArray<T> | Readonly<Record<any, T>> | ReadonlySet<T> | ReadonlyMap<unknown, T>,
): Gen<T> => {
  const elements = Array.isArray(collection)
    ? collection
    : collection instanceof Set
    ? [...collection.values()]
    : collection instanceof Map
    ? [...collection.values()]
    : Object.values(collection);

  return elements.length === 0
    ? exhausted()
    : noShrink(map(integer.unscaled(0, elements.length - 1), (ix) => elements[ix]));
};
