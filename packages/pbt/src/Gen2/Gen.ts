import { GenFunction, GenIteration } from './GenFunction';
import { RandomStream, Seed, Size, CalculateComplexity } from './Imports';
import { integer, naturalNumber } from './Number';
import { filter, flatMap, map, noComplexity, noShrink } from './Operators';
import { Shrinker } from './Shrink';
import { Range } from './Range';
import { array, Collection, element } from './Collections';

export type IGen<T> = RandomStream<GenIteration<T>> & {
  readonly genFunction: GenFunction<T>;
  map<U>(f: (x: T) => U): IGen<U>;
  flatMap<U>(k: (x: T) => IGen<U>): IGen<U>;
  filter(predicate: (x: T) => boolean): IGen<T>;
  noShrink(): IGen<T>;
  noComplexity(): IGen<T>;
};

export class Gen<T> implements IGen<T> {
  static create<T>(
    f: (seed: Seed, size: Size) => T,
    shrinker: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): Gen<T> {
    return new Gen(GenFunction.create(f, shrinker, calculateComplexity));
  }

  static constant<T>(x: T): Gen<T> {
    return new Gen(GenFunction.constant(x));
  }

  static integer(range?: Range): Gen<number> {
    return new Gen(integer(range));
  }

  static naturalNumber(max?: number): Gen<number> {
    return new Gen(naturalNumber(max));
  }

  static array<T>(elementGen: Gen<T>, range?: Range): Gen<T[]> {
    return new Gen(array(elementGen.genFunction, range));
  }

  static element<T>(collection: Collection<T>) {
    return new Gen(element(collection));
  }

  constructor(public readonly genFunction: GenFunction<T>) {}

  map<U>(f: (x: T) => U): Gen<U> {
    return new Gen<U>(map(this.genFunction, f));
  }

  flatMap<U>(k: (x: T) => Gen<U>): Gen<U> {
    const genFunctionK = (x: T): GenFunction<U> => k(x).genFunction;
    return new Gen<U>(flatMap(this.genFunction, genFunctionK));
  }

  filter(predicate: (x: T) => boolean): Gen<T> {
    return new Gen<T>(filter(this.genFunction, predicate));
  }

  noShrink(): Gen<T> {
    return new Gen<T>(noShrink(this.genFunction));
  }

  noComplexity(): Gen<T> {
    return new Gen<T>(noComplexity(this.genFunction));
  }

  run(seed: number | Seed, size: number): Iterable<GenIteration<T>> {
    const s = typeof seed === 'number' ? Seed.create(seed) : seed;
    return this.genFunction(s, size);
  }
}
