import { Seed } from '../Core';
import { ArrayGen, Gen, GenFactory } from './Abstractions';
import { GenFunction, GenIteration } from './GenFunction';

export class BaseGen<T> implements Gen<T> {
  constructor(public readonly genFunction: GenFunction<T>, private readonly genFactory: GenFactory) {}

  array(): ArrayGen<T> {
    return this.genFactory.array(this);
  }

  map<U>(f: (x: T) => U): Gen<U> {
    return new BaseGen<U>(GenFunction.map(this.genFunction, f), this.genFactory);
  }

  flatMap<U>(k: (x: T) => Gen<U>): Gen<U> {
    const genFunctionK = (x: T): GenFunction<U> => k(x).genFunction;
    return new BaseGen<U>(GenFunction.flatMap(this.genFunction, genFunctionK), this.genFactory);
  }

  filter(predicate: (x: T) => boolean): Gen<T> {
    return new BaseGen<T>(GenFunction.filter(this.genFunction, predicate), this.genFactory);
  }

  noShrink(): Gen<T> {
    return new BaseGen<T>(GenFunction.noShrink(this.genFunction), this.genFactory);
  }

  noComplexity(): Gen<T> {
    return new BaseGen<T>(GenFunction.noComplexity(this.genFunction), this.genFactory);
  }

  run(seed: number | Seed, size: number): Iterable<GenIteration<T>> {
    const s = typeof seed === 'number' ? Seed.create(seed) : seed;
    return this.genFunction(s, size);
  }
}
