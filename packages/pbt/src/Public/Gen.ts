import * as Core from '../Core';
import * as InternalGen from '../Gen';
import { RandomStream } from './RandomStream';

export type Shrinker<T> = InternalGen.Shrinker<T>;

export type GenFunction<T> = InternalGen.Gen<T>;

const mapExternalKToInternalK = <T, U>(k: (x: T) => Gen<U>): ((x: T) => GenFunction<U>) => (x) => k(x).genFunction;

export class Gen<T> implements RandomStream<InternalGen.GenIteration<T>> {
  constructor(public readonly genFunction: GenFunction<T>) {}

  map<U>(f: (x: T) => U): Gen<U> {
    return new Gen<U>(InternalGen.map(this.genFunction, f));
  }

  flatMap<U>(k: (x: T) => Gen<U>): Gen<U> {
    return new Gen<U>(InternalGen.flatMap(this.genFunction, mapExternalKToInternalK(k)));
  }

  filter(predicate: (x: T) => boolean): Gen<T> {
    return new Gen<T>(InternalGen.filter(this.genFunction, predicate));
  }

  reduce<U>(length: number, f: (acc: U, x: T, i: number) => U, init: U): Gen<U> {
    return new Gen<U>(InternalGen.reduce(this.genFunction, length, f, init));
  }

  noShrink(): Gen<T> {
    return new Gen<T>(InternalGen.noShrink(this.genFunction));
  }

  postShrink(shrinker: Shrinker<T>): Gen<T> {
    return new Gen<T>(InternalGen.postShrink(this.genFunction, shrinker));
  }

  run(seed: number, size: number): Iterable<InternalGen.GenIteration<T>> {
    const internalGen = this.genFunction;

    const internalSeed = Core.Seed.create(seed);
    const internalIterations = internalGen(internalSeed, size);

    return internalIterations;
  }
}

export const gen = {
  create: <T>(f: (seed: Core.Seed, size: Core.Size) => T, shrinker: InternalGen.Shrinker<T>): Gen<T> =>
    new Gen(InternalGen.create(f, shrinker)),

  integer: {
    unscaled: (min: number, max: number): Gen<number> => new Gen(InternalGen.integer.unscaled(min, max)),
    scaleLinearly: (min: number, max: number): Gen<number> => new Gen(InternalGen.integer.scaleLinearly(min, max)),
  },

  naturalNumber: {
    unscaled: (max?: number): Gen<number> => new Gen(InternalGen.naturalNumber.unscaled(max)),
    scaleLinearly: (max?: number): Gen<number> => new Gen(InternalGen.naturalNumber.scaleLinearly(max)),
  },

  array: {
    unscaled: <T>(min: number, max: number, gen: Gen<T>): Gen<T[]> =>
      new Gen<T[]>(InternalGen.array.unscaled(min, max, gen.genFunction)),
    scaleLinearly: <T>(min: number, max: number, gen: Gen<T>): Gen<T[]> =>
      new Gen<T[]>(InternalGen.array.scaleLinearly(min, max, gen.genFunction)),
  },

  element: <T>(collection: Array<T> | Record<any, T> | Set<T> | Map<any, T>): Gen<T> =>
    new Gen(InternalGen.element(collection)),
};
