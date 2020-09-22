import { Seed, Size } from '../Core';
import * as Internal from '../Gen';
import { RandomStream } from './RandomStream';

const mapExternalKToInternalK = <T, U>(k: (x: T) => Gen<U>): ((x: T) => Internal.Gen<U>) => {
  return (x) => {
    const external = k(x);
    return external.genFunction;
  };
};

export type Shrinker<T> = Internal.Shrinker<T>;

export class Gen<T> implements RandomStream<Internal.GenIteration<T>> {
  static create = <T>(f: (seed: Seed, size: Size) => T, shrinker: Internal.Shrinker<T>): Gen<T> =>
    new Gen(Internal.create(f, shrinker));

  static integer = {
    unscaled: (min: number, max: number): Gen<number> => new Gen(Internal.integer.unscaled(min, max)),
    scaleLinearly: (min: number, max: number): Gen<number> => new Gen(Internal.integer.scaleLinearly(min, max)),
  };

  static naturalNumber = {
    unscaled: (max?: number): Gen<number> => new Gen(Internal.naturalNumber.unscaled(max)),
    scaleLinearly: (max?: number): Gen<number> => new Gen(Internal.naturalNumber.scaleLinearly(max)),
  };

  static array = {
    unscaled: <T>(min: number, max: number, gen: Gen<T>): Gen<T[]> =>
      new Gen<T[]>(Internal.array.unscaled(min, max, gen.genFunction)),
    scaleLinearly: <T>(min: number, max: number, gen: Gen<T>): Gen<T[]> =>
      new Gen<T[]>(Internal.array.scaleLinearly(min, max, gen.genFunction)),
  };

  static element = <T>(collection: Array<T> | Record<any, T> | Set<T> | Map<any, T>): Gen<T> =>
    new Gen(Internal.element(collection));

  private constructor(public readonly genFunction: Internal.Gen<T>) {}

  map<U>(f: (x: T) => U): Gen<U> {
    return new Gen<U>(Internal.map(this.genFunction, f));
  }

  flatMap<U>(k: (x: T) => Gen<U>): Gen<U> {
    return new Gen<U>(Internal.flatMap(this.genFunction, mapExternalKToInternalK(k)));
  }

  filter(predicate: (x: T) => boolean): Gen<T> {
    return new Gen<T>(Internal.filter(this.genFunction, predicate));
  }

  reduce<U>(length: number, f: (acc: U, x: T, i: number) => U, init: U): Gen<U> {
    return new Gen<U>(Internal.reduce(this.genFunction, length, f, init));
  }

  noShrink(): Gen<T> {
    return new Gen<T>(Internal.noShrink(this.genFunction));
  }

  postShrink(shrinker: Shrinker<T>): Gen<T> {
    return new Gen<T>(Internal.postShrink(this.genFunction, shrinker));
  }

  run(seed: Seed, size: Size): Iterable<Internal.GenIteration<T>> {
    return this.genFunction(seed, size);
  }
}
