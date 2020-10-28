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
}
