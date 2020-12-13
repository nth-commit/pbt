import { Gen } from '../Gen';
import { GenRunnable } from '../GenRunnable';
import { Calculator } from '../../Number';
import { RawGenImpl } from './RawGenImpl';

export type FloatGen = Gen<number> & {
  between(min: number, max: number): FloatGen;
  greaterThanEqual(min: number): FloatGen;
  lessThanEqual(max: number): FloatGen;
  betweenPrecision(min: number, max: number): FloatGen;
  ofMinPrecision(max: number): FloatGen;
  ofMaxPrecision(max: number): FloatGen;
  origin(origin: number): FloatGen;
  noBias(): FloatGen;
};

type FloatGenConfig = Readonly<{
  min: number | null;
  max: number | null;
  origin: number | null;
  minPrecision: number | null;
  maxPrecision: number | null;
  noBias: boolean;
}>;

// TODO: Origin validation (defer to genFactory.integer())
// TODO: Handle decimal min/max by destructuring into min/max integer component and min/max fractional component
// TODO: Handle a min/max range of less than 2
// TODO: ofPrecision(p) (like Array.ofLength)
// TODO: Negative ranges do not shrink to the origin e.g. Gen.float().between(-10, -1) does not minimise to -1 (it minimises to -2, off-by-one)
// TODO: Add "unsafe" filter, a filter that does not produce discards. Use internally in float gen

export const FloatGen = {
  create: <TNumber>(calculator: Calculator<TNumber>): FloatGen => {
    class FloatGenImpl extends RawGenImpl<number> implements FloatGen {
      constructor(private readonly config: Readonly<FloatGenConfig>) {
        super(GenRunnable.delay(() => genFloat(calculator, config)));
      }

      between(min: number, max: number): FloatGen {
        return this.withConfig({ min, max });
      }

      greaterThanEqual(min: number): FloatGen {
        return this.withConfig({ min });
      }

      lessThanEqual(max: number): FloatGen {
        return this.withConfig({ max });
      }

      /* istanbul ignore next */
      origin(origin: number): FloatGen {
        return this.withConfig({ origin });
      }

      betweenPrecision(min: number, max: number): FloatGen {
        return this.withConfig({ minPrecision: min, maxPrecision: max });
      }

      ofMinPrecision(min: number): FloatGen {
        return this.withConfig({ minPrecision: min });
      }

      ofMaxPrecision(max: number): FloatGen {
        return this.withConfig({ maxPrecision: max });
      }

      /* istanbul ignore next */
      noBias(): FloatGen {
        return this.withConfig({ noBias: true });
      }

      private withConfig(config: Partial<FloatGenConfig>): FloatGen {
        return new FloatGenImpl({
          ...this.config,
          ...config,
        });
      }
    }

    return new FloatGenImpl({
      min: null,
      max: null,
      origin: null,
      minPrecision: null,
      maxPrecision: null,
      noBias: false,
    });
  },
};

type GenFloatConstants<TNumber> = {
  FLOAT_BITS: TNumber;
  DEFAULT_MIN_PRECISION: TNumber;
  DEFAULT_MAX_PRECISION: TNumber;
  MIN_INT_32: TNumber;
  MAX_INT_32: TNumber;
};

const genFloat = <TNumber>(calculator: Calculator<TNumber>, args: FloatGenConfig): GenRunnable<number> => {
  const constants = createConstants(calculator);

  const minPrecision = tryDeriveMinPrecision(constants, calculator, args.minPrecision);
  if (typeof minPrecision === 'string') {
    return Gen.error(minPrecision);
  }

  const maxPrecision = tryDeriveMaxPrecision(constants, calculator, args.maxPrecision);
  if (typeof maxPrecision === 'string') {
    return Gen.error(maxPrecision);
  }

  const min = tryDeriveMin(constants, calculator, args.min, minPrecision, maxPrecision);
  if (typeof min === 'string') {
    return Gen.error(min);
  }

  const max = tryDeriveMax(constants, calculator, args.max, minPrecision, maxPrecision);
  if (typeof max === 'string') {
    return Gen.error(max);
  }

  /**
   * Generate integers between the given min and max, with some padding allocated, so that the integers can be combined
   * with some fractional component to produce decimals that are still within the range.
   */
  const genIntegralComponent = Gen.integral(calculator).between(
    calculator.add(min, calculator.one),
    calculator.sub(max, calculator.one),
  );

  /**
   * Don't shrink the precision - the shrink vector for the right-side of the decimal is the fractional component
   * itself.
   */
  const genPrecision = Gen.integral(calculator).between(minPrecision, maxPrecision).noShrink();

  /**
   * Create an integer generator from a given precision. The integers are ranged so that they express the full range of
   * the precision. It is intended that the integers produced by the resultant generator are scaled down to be the
   * fractional component of a decimal.
   *    Ex 1. Precision = 1, Integers ∉ [0, 9], Fractional components ∉ [0.0, 0.9]
   *    Ex 2. Precision = 2, Integers ∉ [0, 99], Fractional components ∉ [0.0, 0.99]
   *
   * The integers produced are not biased - the bias is determined by the precision. For smaller sizes, smaller
   * precisions will be generated, producing "less complex" fractions.
   */
  const genFractionalComponent = (precision: TNumber): Gen<TNumber> => {
    const maxFractionalComponentAsInteger = calculator.pow(calculator.ten, precision);

    const baseGenFractionalComponent = Gen.integral(calculator)
      .between(calculator.zero, maxFractionalComponentAsInteger)
      .noBias()
      .map((fractionalComponentAsInteger) => {
        const integerToFractionRatio = calculator.pow(calculator.ten, precision);
        return calculator.div(fractionalComponentAsInteger, integerToFractionRatio);
      });

    if (calculator.equals(minPrecision, calculator.zero)) {
      return baseGenFractionalComponent;
    }

    return baseGenFractionalComponent.filter((fractionalComponent) =>
      calculator.greaterThanEquals(
        calculator.precisionOf(calculator.round(fractionalComponent, minPrecision)),
        minPrecision,
      ),
    );
  };

  return Gen.flatMap(genIntegralComponent, genPrecision, (integralComponent, precision) =>
    genFractionalComponent(precision).map((fractionalComponentAsInteger) =>
      makeDecimal(calculator, integralComponent, fractionalComponentAsInteger),
    ),
  ).map(calculator.toNumber);
};

const makeDecimal = <TNumber>(
  calculator: Calculator<TNumber>,
  integerComponent: TNumber,
  fractionalComponent: TNumber,
): TNumber => {
  switch (calculator.sign(integerComponent)) {
    case -1:
      return calculator.sub(integerComponent, fractionalComponent);
    case 1:
      return calculator.add(integerComponent, fractionalComponent);
    /*istanbul ignore next */
    case 0:
      return fractionalComponent;
  }
};

const createConstants = <TNumber>(calculator: Calculator<TNumber>): GenFloatConstants<TNumber> => {
  const MAX_INT_32 = calculator.fromNumberUnsafe(Math.pow(2, 31));
  return {
    FLOAT_BITS: calculator.fromNumberUnsafe(16),
    DEFAULT_MIN_PRECISION: calculator.zero,
    DEFAULT_MAX_PRECISION: calculator.fromNumberUnsafe(16),
    MIN_INT_32: calculator.negate(MAX_INT_32),
    MAX_INT_32,
  };
};

const tryDeriveMinPrecision = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minPrecisionArg: number | null,
): TNumber | string => {
  if (minPrecisionArg === null) {
    return constants.DEFAULT_MIN_PRECISION;
  }

  const minPrecision = calculator.fromNumber(minPrecisionArg);

  /* istanbul ignore next */
  if (minPrecision === null) {
    return `Minimum precision was not able to be parsed, minPrecision = ${minPrecisionArg}`;
  }

  if (calculator.equals(calculator.precisionOf(minPrecision), calculator.zero) === false) {
    return `Minimum precision must be an integer, minPrecision = ${minPrecisionArg}`;
  }

  if (calculator.lessThan(minPrecision, calculator.zero)) {
    return `Minimum precision must be non-negative, minPrecision = ${minPrecisionArg}`;
  }

  if (calculator.greaterThan(minPrecision, constants.FLOAT_BITS)) {
    return `Minimum precision must not exceed ${calculator.toNumber(
      constants.FLOAT_BITS,
    )} (floating point precision), minPrecision = ${minPrecisionArg}`;
  }

  return minPrecision;
};

const tryDeriveMaxPrecision = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  maxPrecisionArg: number | null,
): TNumber | string => {
  if (maxPrecisionArg === null) {
    return constants.DEFAULT_MAX_PRECISION;
  }

  const maxPrecision = calculator.fromNumber(maxPrecisionArg);

  /* istanbul ignore next */
  if (maxPrecision === null) {
    return `Maximum precision was not able to be parsed, maxPrecision = ${maxPrecisionArg}`;
  }

  if (calculator.equals(calculator.precisionOf(maxPrecision), calculator.zero) === false) {
    return `Maximum precision must be an integer, maxPrecision = ${maxPrecisionArg}`;
  }

  if (calculator.lessThan(maxPrecision, calculator.zero)) {
    return `Maximum precision must be non-negative, maxPrecision = ${maxPrecisionArg}`;
  }

  if (calculator.greaterThan(maxPrecision, constants.FLOAT_BITS)) {
    return `Maximum precision must not exceed ${constants.FLOAT_BITS} (floating point precision), maxPrecision = ${maxPrecisionArg}`;
  }

  return maxPrecision;
};

const tryDeriveMin = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minArg: number | null,
  minPrecision: TNumber,
  maxPrecision: TNumber,
): TNumber | string =>
  minArg === null
    ? deriveDefaultMin(constants, calculator, minPrecision)
    : validateMinArg(constants, calculator, minArg, minPrecision, maxPrecision);

const deriveDefaultMin = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minPrecision: TNumber,
): TNumber => {
  if (calculator.greaterThan(minPrecision, calculator.zero)) {
    const exponent = calculator.sub(calculator.sub(constants.FLOAT_BITS, minPrecision), calculator.one);
    return calculator.negate(calculator.pow(calculator.ten, exponent));
  }

  return constants.MIN_INT_32;
};

const validateMinArg = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minArg: number,
  minPrecision: TNumber,
  maxPrecision: TNumber,
): TNumber | string => {
  const min = calculator.fromNumber(minArg);

  /* istanbul ignore next */
  if (min === null) {
    return `Minimum was not able to be parsed, min = ${min}`;
  }

  const precision = calculator.precisionOf(min);
  if (calculator.greaterThan(precision, maxPrecision)) {
    return `Bound violates maximum precision constraint, minPrecision = ${minPrecision}, maxPrecision = ${maxPrecision}, min = ${minArg}`;
  }

  const precisionMagnitude = magnitudeOfPrecision(constants, calculator, minPrecision);
  const absoluteMin = calculator.abs(min);
  if (precisionMagnitude !== null && calculator.greaterThan(absoluteMin, precisionMagnitude)) {
    return `Bound violates minimum precision constraint, minPrecision = ${minPrecision}, min = ${min}`;
  }

  return calculator.round(min, calculator.zero);
};

const tryDeriveMax = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  maxArg: number | null,
  minPrecision: TNumber,
  maxPrecision: TNumber,
): TNumber | string =>
  maxArg === null
    ? deriveDefaultMax(constants, calculator, minPrecision)
    : validateMaxArg(constants, calculator, maxArg, minPrecision, maxPrecision);

const deriveDefaultMax = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minPrecision: TNumber,
): TNumber => {
  /* istanbul ignore else */
  if (calculator.greaterThan(minPrecision, calculator.zero)) {
    const exponent = calculator.sub(constants.FLOAT_BITS, minPrecision);
    return calculator.pow(calculator.ten, exponent);
  }

  /* istanbul ignore next */
  return constants.MAX_INT_32;
};

const validateMaxArg = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  maxArg: number,
  minPrecision: TNumber,
  maxPrecision: TNumber,
): TNumber | string => {
  const max = calculator.fromNumber(maxArg);

  /* istanbul ignore next */
  if (max === null) {
    return `Maximum was not able to be parsed, max = ${max}`;
  }

  const precision = calculator.precisionOf(max);
  if (calculator.greaterThan(precision, maxPrecision)) {
    return `Bound violates maximum precision constraint, minPrecision = ${minPrecision}, maxPrecision = ${maxPrecision}, max = ${maxArg}`;
  }

  const precisionMagnitude = magnitudeOfPrecision(constants, calculator, minPrecision);
  const absoluteMax = calculator.abs(max);
  if (precisionMagnitude !== null && calculator.greaterThan(absoluteMax, precisionMagnitude)) {
    return `Bound violates minimum precision constraint, minPrecision = ${minPrecision}, max = ${max}`;
  }

  return calculator.round(max, calculator.zero);
};

const unitOfPrecision = <TNumber>(calculator: Calculator<TNumber>, precision: TNumber): TNumber =>
  calculator.pow(calculator.ten, calculator.negate(precision));

const magnitudeOfPrecision = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  precision: TNumber,
): TNumber | null => {
  if (calculator.equals(precision, calculator.zero)) return null;

  return calculator.sub(
    calculator.pow(calculator.ten, calculator.sub(constants.FLOAT_BITS, precision)),
    unitOfPrecision(calculator, precision),
  );
};
