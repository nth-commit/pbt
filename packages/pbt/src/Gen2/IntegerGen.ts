import { Seed, Size } from '../Core';
import { GenFactory, IntegerGen } from './Abstractions';
import { BaseGen } from './BaseGen';
import { ScaleMode, Range } from './Range';
import { GenFunction } from './GenFunction';
import { Shrink } from './Shrink';

const MAX_INT_32 = Math.pow(2, 31) - 1;
const MIN_INT_32 = -MAX_INT_32;

type IntegerGenArgs = Readonly<{
  min: number | null;
  max: number | null;
  origin: number | null;
  scale: ScaleMode | null;
}>;

export const integer = (genFactory: GenFactory): IntegerGen => {
  class IntegerGenImpl extends BaseGen<number> implements IntegerGen {
    constructor(private readonly args: Readonly<IntegerGenArgs>) {
      super(integerFunction(args), genFactory);
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
    min: null,
    max: null,
    origin: null,
    scale: null,
  });
};

const integerFunction = (args: IntegerGenArgs): GenFunction<number> => {
  const min = args.min === null ? MIN_INT_32 : args.min;
  const max = args.max === null ? MAX_INT_32 : args.max;
  const origin = args.origin === null ? 0 : args.origin; // Make this smarter
  const scale = args.scale === null ? 'linear' : args.scale;

  const range = Range.createFrom(min, max, origin, scale);

  return GenFunction.create(
    (seed, size) => nextNumber(seed, size, range),
    Shrink.towardsNumber(range.origin),
    range.getProportionalDistance,
  );
};

const nextNumber = (seed: Seed, size: Size, range: Range): number => seed.nextInt(...range.getSizedBounds(size));
