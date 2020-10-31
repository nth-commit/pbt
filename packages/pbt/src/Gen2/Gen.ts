/* istanbul ignore file */

import { Seed, Size } from '../Core';
import { CalculateComplexity } from '../GenTree';
import { GenFunction } from './GenFunction';
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

export type AnyValues = any[];

export type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

export namespace Gen {
  export function create<T>(
    generate: (seed: Seed, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): Gen<T> {
    return new BaseGen(GenFunction.create(generate, shrink, calculateComplexity), genFactory);
  }

  export function constant<T>(x: T): Gen<T> {
    return new BaseGen(GenFunction.constant(x), genFactory);
  }

  export function array<T>(elementGen: Gen<T>): ArrayGen<T> {
    return genFactory.array(elementGen);
  }

  export function integer(): IntegerGen {
    return genFactory.integer();
  }

  export function zip<Ts extends any[]>(...gens: Gens<Ts>): Gen<Ts> {
    switch (gens.length) {
      case 0:
        return constant(([] as unknown) as Ts);
      default: {
        const [gen, ...nextGens] = gens;
        return gen.flatMap((x) => zip(...nextGens).map((xs) => ([x, ...xs] as unknown) as Ts));
      }
    }
  }

  export type MapperFunction<Ts extends any[], U> = (...xs: { [TLabel in keyof Ts]: Ts[TLabel] }) => U;
  export type MapArgs<Ts extends any[], U> = [...Gens<Ts>, MapperFunction<Ts, U>];

  export function map<Ts extends any[], U>(...args: MapArgs<Ts, U>): Gen<U> {
    const [f, ...gens] = args.reverse();
    const fUnsafe = f as MapperFunction<any[], U>;
    const gensUnsafe = gens as Gens<any[]>;
    return zip(...gensUnsafe).map(([...xs]) => fUnsafe(...xs));
  }
}
