import { Range, ScaleMode } from '../Range';
import { Shrink } from '../Shrink';
import { RawGenImpl } from './RawGenImpl';
import { Gen } from '../Gen';
import { Calculator } from '../../Number';
import { GenRunnable } from '../GenRunnable';

export type IntegralGen<TInteger> = Gen<TInteger> & {
  between(min: TInteger, max: TInteger): IntegralGen<TInteger>;
  greaterThanEqual(min: TInteger): IntegralGen<TInteger>;
  lessThanEqual(max: TInteger): IntegralGen<TInteger>;
  origin(origin: TInteger): IntegralGen<TInteger>;
  noBias(): IntegralGen<TInteger>;
};

export const IntegralGen = {
  create: <TNumber>(calculator: Calculator<TNumber>): IntegralGen<TNumber> => {
    class IntegralGenImpl extends RawGenImpl<TNumber> implements IntegralGen<TNumber> {
      constructor(private readonly config: Readonly<IntegralGenConfig<TNumber>>) {
        super(GenRunnable.delay(() => integralGen(calculator, config)));
      }

      greaterThanEqual(min: TNumber): IntegralGen<TNumber> {
        return this.withConfig({ min });
      }

      lessThanEqual(max: TNumber): IntegralGen<TNumber> {
        return this.withConfig({ max });
      }

      between(min: TNumber, max: TNumber): IntegralGen<TNumber> {
        return this.withConfig({ min, max });
      }

      origin(origin: TNumber): IntegralGen<TNumber> {
        return this.withConfig({ origin });
      }

      noBias(): IntegralGen<TNumber> {
        return this.withConfig({ scale: 'constant' });
      }

      private withConfig(config: Partial<IntegralGenConfig<TNumber>>): IntegralGen<TNumber> {
        return new IntegralGenImpl({
          ...this.config,
          ...config,
        });
      }
    }

    return new IntegralGenImpl({
      min: null,
      max: null,
      origin: null,
      scale: null,
    });
  },
};

const MAX_INT_32 = Math.pow(2, 31);
const MIN_INT_32 = -MAX_INT_32;

type IntegralGenConfig<TInteger> = Readonly<{
  min: TInteger | null;
  max: TInteger | null;
  origin: TInteger | null;
  scale: ScaleMode | null;
}>;

const integralGen = <TNumber>(calculator: Calculator<TNumber>, args: IntegralGenConfig<TNumber>): Gen<TNumber> => {
  const min = tryDeriveMin(calculator, args.min);
  if (typeof min === 'string') {
    return Gen.error(min);
  }

  const max = tryDeriveMax(calculator, args.max);
  if (typeof max === 'string') {
    return Gen.error(max);
  }

  const origin = tryDeriveOrigin(calculator, min, max, args.origin);
  if (typeof origin === 'string') {
    return Gen.error(origin);
  }

  const scale = args.scale === null ? 'linear' : args.scale;
  const range = Range.createFrom<TNumber>(calculator, min, max, origin, scale);

  return Gen.create(
    (useNextInt, size) => {
      const [min, max] = range.getSizedBounds(calculator.fromNumberUnsafe(size));
      const next = useNextInt(calculator.toNumber(min), calculator.toNumber(max));
      return calculator.fromNumberUnsafe(next);
    },
    Shrink.towardsNumber(calculator, range.origin),
    (value) => calculator.toNumber(range.getProportionalDistance(value)),
  );
};

const tryDeriveMin = <TNumber>(calculator: Calculator<TNumber>, min: TNumber | null): TNumber | string => {
  if (min === null) return calculator.fromNumberUnsafe(MIN_INT_32);

  if (calculator.equals(calculator.precisionOf(min), calculator.zero) === false)
    return `Minimum must be an integer, min = ${min}`;

  return min;
};

const tryDeriveMax = <TNumber>(calculator: Calculator<TNumber>, max: TNumber | null): TNumber | string => {
  if (max === null) return calculator.fromNumberUnsafe(MAX_INT_32);

  if (calculator.equals(calculator.precisionOf(max), calculator.zero) === false)
    return `Maximum must be an integer, max = ${max}`;

  return max;
};

const tryDeriveOrigin = <TNumber>(
  calculator: Calculator<TNumber>,
  min: TNumber,
  max: TNumber,
  origin: TNumber | null,
): TNumber | string => {
  if (origin === null) {
    const canOriginBeZero = isBetween(calculator, min, max, calculator.zero);
    if (canOriginBeZero) return calculator.zero;

    const minToZero = calculator.abs(calculator.sub(min, calculator.zero));
    const maxToZero = calculator.abs(calculator.sub(max, calculator.zero));
    return calculator.lessThan(minToZero, maxToZero) ? min : max;
  }

  if (calculator.equals(calculator.precisionOf(origin), calculator.zero) === false)
    return `Origin must be an integer, origin = ${origin}`;

  if (!isBetween(calculator, min, max, origin))
    return `Origin must be in range, origin = ${origin}, range = [${min}, ${max}]`;

  return origin;
};

const isBetween = <TNumber>(calculator: Calculator<TNumber>, x: TNumber, y: TNumber, n: TNumber) =>
  (calculator.lessThanEquals(x, n) && calculator.lessThanEquals(n, y)) ||
  (calculator.lessThanEquals(y, n) && calculator.lessThanEquals(n, x));
