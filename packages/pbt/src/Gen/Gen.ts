/* istanbul ignore file */

import { CalculateComplexity } from '../GenTree';
import { GenFunction, GenInstanceStatefulFunction } from './GenFunction';
import { Shrinker } from './Shrink';
import { Gen as _Gen, ArrayGen, IntegerGen, GenFactory } from './Abstractions';
import { BaseGen } from './BaseGen';
import { array } from './ArrayGen';
import { integer } from './IntegerGen';

export const genFactory: GenFactory = {
  array: (elementGen) => array(elementGen, genFactory),
  integer: () => integer(genFactory),
};

export type Gen<T> = _Gen<T>;

export type Gens<Ts extends any[]> = { [P in keyof Ts]: Gen<Ts[P]> };

export namespace Gen {
  export function create<T>(
    f: GenInstanceStatefulFunction<T>,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T> = () => 0,
  ): Gen<T> {
    return new BaseGen(GenFunction.create(f, shrink, calculateComplexity), genFactory);
  }

  export function constant<T>(x: T): Gen<T> {
    return new BaseGen(GenFunction.constant(x), genFactory);
  }

  export function error<T>(message: string): Gen<T> {
    return new BaseGen(GenFunction.error(message), genFactory);
  }

  export function array<T>(elementGen: Gen<T>): ArrayGen<T> {
    return genFactory.array(elementGen);
  }

  export function integer(): IntegerGen {
    return genFactory.integer();
  }

  export function zip<Ts extends any[]>(...gens: Gens<Ts>): Gen<Ts> {
    switch (gens.length) {
      case 0: {
        return constant(([] as unknown) as Ts);
      }
      case 1: {
        const [gen] = gens;
        return gen.map((x) => ([x] as unknown) as Ts);
      }
      default: {
        const [gen, ...nextGens] = gens;
        return gen.flatMap((x) => zip(...nextGens).map((xs) => ([x, ...xs] as unknown) as Ts));
      }
    }
  }

  export type MapperFunction<Ts extends any[], U> = (...xs: { [P in keyof Ts]: Ts[P] }) => U;
  export type MapArgs<Ts extends [any, ...any[]], U> = [...Gens<Ts>, MapperFunction<Ts, U>];

  export function map<U>(f: MapperFunction<[], U>): Gen<U>;
  export function map<Ts extends [any, ...any[]], U>(...args: MapArgs<Ts, U>): Gen<U>;
  export function map<Ts extends [any, ...any[]], U>(...args: MapArgs<Ts, U>): Gen<U> {
    const [f, ...gens] = args.reverse();
    const fUnsafe = f as MapperFunction<any[], U>;
    const gensUnsafe = gens as Gens<any[]>;
    return zip(...gensUnsafe).map(([...xs]) => fUnsafe(...xs));
  }

  export function element<T>(collection: T[] | Record<any, T> | Set<T> | Map<unknown, T>): Gen<T> {
    const elements = Array.isArray(collection)
      ? collection
      : collection instanceof Set
      ? [...collection.values()]
      : collection instanceof Map
      ? [...collection.values()]
      : Object.values(collection);

    if (elements.length === 0) {
      return error('Gen.element invoked with empty collection');
    }

    return integer()
      .between(0, elements.length - 1)
      .growBy('constant')
      .map((i) => elements[i])
      .noShrink()
      .noComplexity();
  }
}
