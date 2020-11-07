/* istanbul ignore file */

import { Rng, Size } from '../Core';
import { ArrayGen, Gen, GenConfig, GenFactory } from './Abstractions';
import { GenFunction } from './GenFunction';
import { GenIteration } from './GenIteration';

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

  run(seed: number, size: Size, config: GenConfig = {}): Iterable<GenIteration<T>> {
    return this.genFunction(config.makeRng ? config.makeRng(seed) : Rng.create(seed), size);
  }
}
