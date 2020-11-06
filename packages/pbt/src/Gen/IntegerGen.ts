import { Rng, Size } from '../Core';
import { GenFactory, IntegerGen } from './Abstractions';
import { BaseGen } from './BaseGen';
import { ScaleMode, Range } from './Range';
import { GenFunction } from './GenFunction';
import { Shrink } from './Shrink';

const MAX_INT_32 = Math.pow(2, 31);
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
      super((seed, size) => integerFunction(args)(seed, size), genFactory);
    }

    greaterThanEqual(min: number): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        min,
      });
    }

    lessThanEqual(max: number): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        max,
      });
    }

    between(min: number, max: number): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        min,
        max,
      });
    }

    growBy(scale: ScaleMode): IntegerGen {
      return new IntegerGenImpl({
        ...this.args,
        scale,
      });
    }

    origin(origin: number): IntegerGen {
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
  const min = tryDeriveMin(args.min);
  if (typeof min === 'string') {
    return GenFunction.error(min);
  }

  const max = tryDeriveMax(args.max);
  if (typeof max === 'string') {
    return GenFunction.error(max);
  }

  const origin = tryDeriveOrigin(min, max, args.origin);
  if (typeof origin === 'string') {
    return GenFunction.error(origin);
  }

  const scale = args.scale === null ? 'linear' : args.scale;
  const range = Range.createFrom(min, max, origin, scale);

  return GenFunction.create(
    (seed, size) => nextNumber(seed, size, range),
    Shrink.towardsNumber(range.origin),
    range.getProportionalDistance,
  );
};

const tryDeriveMin = (min: number | null): number | string =>
  min === null ? MIN_INT_32 : Number.isInteger(min) ? min : `Minimum must be an integer, min = ${min}`;

const tryDeriveMax = (max: number | null): number | string =>
  max === null ? MAX_INT_32 : Number.isInteger(max) ? max : `Maximum must be an integer, max = ${max}`;

const tryDeriveOrigin = (min: number, max: number, origin: number | null): number | string => {
  if (origin === null) {
    const canOriginBeZero = isBetween(min, max, 0);
    if (canOriginBeZero) return 0;

    const minToZero = Math.abs(min - 0);
    const maxToZero = Math.abs(max - 0);
    return minToZero < maxToZero ? min : max;
  }

  if (!Number.isInteger(origin)) return `Origin must be an integer, origin = ${origin}`;

  if (!isBetween(min, max, origin)) return `Origin must be in range, origin = ${origin}, range = [${min}, ${max}]`;

  return origin;
};

const nextNumber = (rng: Rng, size: Size, range: Range): [number, Rng] => {
  const bounds = range.getSizedBounds(size);
  const value = rng.value(...bounds);
  // console.log(`seed:value:${rng}[${bounds}] = ${value}`);
  return [value, rng.next()];
};

const isBetween = (x: number, y: number, n: number) => (x <= n && n <= y) || (y <= n && n <= x);
