import { Seed, Size } from '../Core';
import { GenFactory, IntegerGen } from './Abstractions';
import { BaseGen } from './BaseGen';
import { ScaleMode, Range } from './Range';
import { GenFunction } from './GenFunction';
import { Shrink } from './Shrink';

const MAX_INT_32 = Math.pow(2, 31) - 1;
const MIN_INT_32 = -MAX_INT_32;

export const integer = (genFactory: GenFactory): IntegerGen => {
  class IntegerGenImpl extends BaseGen<number> implements IntegerGen {
    constructor(private readonly args: Readonly<IntegerGenImplArgs>) {
      super((seed, size) => {
        const { min, max, scale, origin } = this.args;
        const range = Range.createRange(min, max, origin, scale);
        return integerFunction(range)(seed, size);
      }, genFactory);
    }

    ofRange(min: number, max: number, origin: number | null = null): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        min,
        max,
        origin,
      });
    }

    ofMin(min: number): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        min,
      });
    }

    ofMax(max: number): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        max,
      });
    }

    growBy(scale: ScaleMode): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        scale,
      });
    }

    shrinksTowards(origin: number): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        origin,
      });
    }
  }

  return new IntegerGenImpl({
    min: MIN_INT_32,
    max: MAX_INT_32,
    origin: null,
    scale: 'linear',
  });
};

type IntegerGenImplArgs = Readonly<{
  min: number;
  max: number;
  origin: number | null;
  scale: ScaleMode;
}>;

const integerFunction = (range: Range): GenFunction<number> =>
  GenFunction.create(
    (seed, size) => nextNumber(seed, size, range),
    Shrink.towardsNumber(range.origin),
    range.calculateComplexity,
  );

const nextNumber = (seed: Seed, size: Size, range: Range): number => {
  const { min, max } = range.getSizedBounds(size);
  return seed.nextInt(min, max);
};
