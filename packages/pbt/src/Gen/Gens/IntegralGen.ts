import { Shrink } from '../Shrink';
import { Gen } from '../Gen';
import { Calculator, Integer, Range, ScaleMode } from '../../Number';
import { Result } from '../../Core';
import { PrimitiveGen } from './PrimitiveGen';

export type IntegralGen<TNumber> = Gen<Integer<TNumber>>;

export type IntegralGenConfig<TNumber> = Readonly<{
  min: Integer<TNumber> | null;
  max: Integer<TNumber> | null;
  origin: Integer<TNumber> | null;
  scale: ScaleMode | null;
}>;

export const IntegralGen = {
  create: <TNumber>(calculator: Calculator<TNumber>, config: IntegralGenConfig<TNumber>): IntegralGen<TNumber> => {
    const MAX_INT_32 = Math.pow(2, 31);
    const min = config.min === null ? calculator.loadIntegerUnchecked(-MAX_INT_32) : config.min;
    const max = config.max === null ? calculator.loadIntegerUnchecked(MAX_INT_32) : config.max;

    return deriveOrigin(calculator, min, max, config.origin)
      .map<Gen<Integer<TNumber>>>((origin) => integralGen(calculator, min, max, origin, config.scale || 'linear'))
      .mapError<Gen<Integer<TNumber>>>(Gen.error)
      .flatten();
  },
};

const integralGen = <TNumber>(
  calculator: Calculator<TNumber>,
  min: Integer<TNumber>,
  max: Integer<TNumber>,
  origin: Integer<TNumber>,
  scale: ScaleMode,
): Gen<Integer<TNumber>> => {
  const range = Range.createFrom<TNumber>(calculator, min, max, origin, scale);
  return PrimitiveGen.create<Integer<TNumber>, TNumber>(
    calculator,
    (useNextInt, size) => useNextInt(...range.getSizedBounds(calculator.loadIntegerUnchecked(size))),
    Shrink.towardsNumber(calculator, range.origin),
    range.getProportionalDistance,
  );
};

const deriveOrigin = <TNumber>(
  calculator: Calculator<TNumber>,
  min: Integer<TNumber>,
  max: Integer<TNumber>,
  origin: Integer<TNumber> | null,
): Result<Integer<TNumber>, string> =>
  origin === null ? Result.ofValue(inferOrigin(calculator, min, max)) : validateOrigin(calculator, min, max, origin);

const validateOrigin = <TNumber>(
  calculator: Calculator<TNumber>,
  min: Integer<TNumber>,
  max: Integer<TNumber>,
  origin: Integer<TNumber>,
): Result<Integer<TNumber>, string> =>
  isBetween(calculator, min, max, origin)
    ? Result.ofValue(origin)
    : Result.ofError(`Origin must be in range, origin = ${origin}, range = [${min}, ${max}]`);

const inferOrigin = <TNumber>(
  calculator: Calculator<TNumber>,
  min: Integer<TNumber>,
  max: Integer<TNumber>,
): Integer<TNumber> => {
  const canOriginBeZero = isBetween(calculator, min, max, calculator.zero);
  if (canOriginBeZero) return calculator.zero;

  const minToZero = calculator.absoluteOf(calculator.sub(min, calculator.zero));
  const maxToZero = calculator.absoluteOf(calculator.sub(max, calculator.zero));
  return calculator.lessThan(minToZero, maxToZero) ? min : max;
};

const isBetween = <TNumber>(
  calculator: Calculator<TNumber>,
  x: Integer<TNumber>,
  y: Integer<TNumber>,
  n: Integer<TNumber>,
) =>
  (calculator.lessThanEquals(x, n) && calculator.lessThanEquals(n, y)) ||
  (calculator.lessThanEquals(y, n) && calculator.lessThanEquals(n, x));
