import { Gen } from '../Gen';
import { GenRunnable } from '../GenRunnable';
import { Calculator, Integer, Natural, Real } from '../../Number';
import { RawGenImpl } from './RawGenImpl';
import { IntegralGen } from './IntegralGen';
import { Result } from '../../Core';

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
        super(
          GenRunnable.delay(() => {
            const constants = createConstants(calculator);

            return Result.concat2(
              deriveMinPrecision(calculator, constants, config.minPrecision),
              deriveMaxPrecision(calculator, constants, config.maxPrecision),
            )
              .flatMap(([minPrecision, maxPrecision]) =>
                Result.concat2(
                  deriveMin(calculator, constants, config.min, minPrecision, maxPrecision),
                  deriveMax(calculator, constants, config.max, minPrecision, maxPrecision),
                ).map(([min, max]) => genFloat(calculator, min, max, minPrecision, maxPrecision)),
              )
              .mapError<GenRunnable<number>>(Gen.error)
              .flatten();
          }),
        );
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
  FLOAT_BITS: Natural<TNumber>;
  DEFAULT_MIN_PRECISION: Natural<TNumber>;
  DEFAULT_MAX_PRECISION: Natural<TNumber>;
  MIN_INT_32: Integer<TNumber>;
  MAX_INT_32: Integer<TNumber>;
};

const genFloat = <TNumber>(
  calculator: Calculator<TNumber>,
  min: Integer<TNumber>,
  max: Integer<TNumber>,
  minPrecision: Natural<TNumber>,
  maxPrecision: Natural<TNumber>,
): GenRunnable<number> =>
  Gen.flatMap(
    genIntegralComponent(calculator, min, max),
    genPrecision(calculator, minPrecision, maxPrecision),
    (integralComponent, precision) =>
      genFractionalComponent(calculator, minPrecision, precision).map((fractionalComponentAsInteger) =>
        makeDecimal(calculator, integralComponent, fractionalComponentAsInteger),
      ),
  ).map(calculator.unload);

/**
 * Generate integers between the given min and max, with some padding allocated, so that the integers can be combined
 * with some fractional component to produce decimals that are still within the range.
 */
const genIntegralComponent = <TNumber>(
  calculator: Calculator<TNumber>,
  min: Integer<TNumber>,
  max: Integer<TNumber>,
): Gen<Integer<TNumber>> =>
  IntegralGen.create(calculator, {
    min: calculator.add(min, calculator.one),
    max: calculator.sub(max, calculator.one),
    origin: null,
    scale: 'linear',
  });

/**
 * Don't shrink the precision - the shrink vector for the right-side of the decimal is the fractional component itself.
 */
const genPrecision = <TNumber>(
  calculator: Calculator<TNumber>,
  minPrecision: Natural<TNumber>,
  maxPrecision: Natural<TNumber>,
): Gen<Natural<TNumber>> =>
  IntegralGen.create(calculator, {
    min: minPrecision,
    max: maxPrecision,
    origin: null,
    scale: 'linear',
  }).noShrink() as Gen<Natural<TNumber>>;

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
const genFractionalComponent = <TNumber>(
  calculator: Calculator<TNumber>,
  minPrecision: Natural<TNumber>,
  currentPrecision: Natural<TNumber>,
): Gen<Real<TNumber>> => {
  const maxFractionalComponentAsInteger = calculator.pow(calculator.ten, currentPrecision);

  const baseGenFractionalComponent = IntegralGen.create(calculator, {
    min: calculator.zero,
    max: maxFractionalComponentAsInteger,
    origin: null,
    scale: 'constant',
  }).map((fractionalComponentAsInteger) => {
    const integerToFractionRatio = calculator.pow(calculator.ten, currentPrecision);
    return calculator.div(fractionalComponentAsInteger, integerToFractionRatio);
  });

  if (calculator.equals(minPrecision, calculator.zero)) {
    return baseGenFractionalComponent;
  }

  return baseGenFractionalComponent.filter((fractionalComponent) => {
    const roundedPrecision = calculator.precisionOf(calculator.round(fractionalComponent, minPrecision));
    return calculator.greaterThanEquals(roundedPrecision, minPrecision);
  });
};

const makeDecimal = <TNumber>(
  calculator: Calculator<TNumber>,
  integerComponent: Integer<TNumber>,
  fractionalComponent: Real<TNumber>,
): Real<TNumber> => {
  switch (calculator.signOf(integerComponent)) {
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
  const MAX_INT_32 = calculator.loadIntegerUnchecked(Math.pow(2, 31));
  return {
    FLOAT_BITS: calculator.loadNaturalUnchecked(16),
    DEFAULT_MIN_PRECISION: calculator.zero,
    DEFAULT_MAX_PRECISION: calculator.loadNaturalUnchecked(16),
    MIN_INT_32: calculator.negationOf(MAX_INT_32),
    MAX_INT_32,
  };
};

const deriveMinPrecision = <TNumber>(
  calculator: Calculator<TNumber>,
  constants: GenFloatConstants<TNumber>,
  minPrecision: number | null,
): Result<Natural<TNumber>, string> =>
  minPrecision === null
    ? Result.ofValue(constants.DEFAULT_MIN_PRECISION)
    : validateMinPrecision(calculator, constants, minPrecision);

const validateMinPrecision = <TNumber>(
  calculator: Calculator<TNumber>,
  constants: GenFloatConstants<TNumber>,
  minPrecision: number,
): Result<Natural<TNumber>, string> =>
  calculator
    .loadNatural(minPrecision)
    .mapError(() => `Minimum precision must be a non-negative integer, minPrecision = ${minPrecision}`)
    .validate(
      (p) => calculator.lessThanEquals(p, constants.FLOAT_BITS),
      `Minimum precision must not exceed ${constants.FLOAT_BITS} (floating point precision), minPrecision = ${minPrecision}`,
    );

const deriveMaxPrecision = <TNumber>(
  calculator: Calculator<TNumber>,
  constants: GenFloatConstants<TNumber>,
  maxPrecision: number | null,
): Result<Natural<TNumber>, string> =>
  maxPrecision === null
    ? Result.ofValue(constants.DEFAULT_MAX_PRECISION)
    : validateMaxPrecision(calculator, constants, maxPrecision);

const validateMaxPrecision = <TNumber>(
  calculator: Calculator<TNumber>,
  constants: GenFloatConstants<TNumber>,
  maxPrecision: number,
): Result<Natural<TNumber>, string> =>
  calculator
    .loadNatural(maxPrecision)
    .mapError(() => `Maximum precision must be a non-negative integer, maxPrecision = ${maxPrecision}`)
    .validate(
      (p) => calculator.lessThanEquals(p, constants.FLOAT_BITS),
      `Maximum precision must not exceed ${constants.FLOAT_BITS} (floating point precision), maxPrecision = ${maxPrecision}`,
    );

const deriveMin = <TNumber>(
  calculator: Calculator<TNumber>,
  constants: GenFloatConstants<TNumber>,
  min: number | null,
  minPrecision: Natural<TNumber>,
  maxPrecision: Natural<TNumber>,
): Result<Integer<TNumber>, string> =>
  min === null
    ? Result.ofValue(inferMin(constants, calculator, minPrecision))
    : validateMin(constants, calculator, min, minPrecision, maxPrecision);

const inferMin = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minPrecision: Natural<TNumber>,
): Integer<TNumber> => {
  if (calculator.greaterThan(minPrecision, calculator.zero)) {
    const exponent = calculator.loadNaturalUnchecked(
      calculator.sub(calculator.sub(constants.FLOAT_BITS, minPrecision), calculator.one),
    );
    return calculator.negationOf(calculator.pow(calculator.ten, exponent));
  }

  return constants.MIN_INT_32;
};

const validateMin = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  min: number,
  minPrecision: Natural<TNumber>,
  maxPrecision: Natural<TNumber>,
): Result<Integer<TNumber>, string> =>
  calculator
    .load(min)
    .validate((m) => {
      const precision = calculator.precisionOf(m);
      return calculator.lessThanEquals(precision, maxPrecision);
    }, `Bound violates maximum precision constraint, minPrecision = ${minPrecision}, maxPrecision = ${maxPrecision}, min = ${min}`)
    .validate((m) => {
      const precisionMagnitude = magnitudeOfPrecision(constants, calculator, minPrecision);
      const absoluteMin = calculator.absoluteOf(m);
      return precisionMagnitude === null || calculator.lessThanEquals(absoluteMin, precisionMagnitude);
    }, `Bound violates minimum precision constraint, minPrecision = ${minPrecision}, min = ${min}`)
    .map((m) => calculator.round(m, calculator.zero));

const deriveMax = <TNumber>(
  calculator: Calculator<TNumber>,
  constants: GenFloatConstants<TNumber>,
  max: number | null,
  minPrecision: Natural<TNumber>,
  maxPrecision: Natural<TNumber>,
): Result<Integer<TNumber>, string> =>
  max === null
    ? Result.ofValue(inferMax(constants, calculator, minPrecision))
    : validateMax(constants, calculator, max, minPrecision, maxPrecision);

const inferMax = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  minPrecision: Integer<TNumber>,
): Integer<TNumber> => {
  if (calculator.greaterThan(minPrecision, calculator.zero)) {
    const exponent = calculator.loadNaturalUnchecked(
      calculator.sub(calculator.sub(constants.FLOAT_BITS, minPrecision), calculator.one),
    );
    return calculator.pow(calculator.ten, exponent);
  }

  return constants.MAX_INT_32;
};

const validateMax = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  max: number,
  minPrecision: Natural<TNumber>,
  maxPrecision: Natural<TNumber>,
): Result<Integer<TNumber>, string> =>
  calculator
    .load(max)
    .validate((m) => {
      const precision = calculator.precisionOf(m);
      return calculator.lessThanEquals(precision, maxPrecision);
    }, `Bound violates maximum precision constraint, minPrecision = ${minPrecision}, maxPrecision = ${maxPrecision}, max = ${max}`)
    .validate((m) => {
      const precisionMagnitude = magnitudeOfPrecision(constants, calculator, minPrecision);
      const absoluteMax = calculator.absoluteOf(m);
      return precisionMagnitude === null || calculator.lessThanEquals(absoluteMax, precisionMagnitude);
    }, `Bound violates minimum precision constraint, minPrecision = ${minPrecision}, max = ${max}`)
    .map((m) => calculator.round(m, calculator.zero));

const unitOfPrecision = <TNumber>(calculator: Calculator<TNumber>, precision: Natural<TNumber>): Real<TNumber> =>
  calculator.pow(calculator.ten, calculator.negationOf(precision));

const magnitudeOfPrecision = <TNumber>(
  constants: GenFloatConstants<TNumber>,
  calculator: Calculator<TNumber>,
  precision: Natural<TNumber>,
): Real<TNumber> | null => {
  if (calculator.equals(precision, calculator.zero)) return null;

  return calculator.sub(
    calculator.pow(calculator.ten, calculator.sub(constants.FLOAT_BITS, precision)),
    unitOfPrecision(calculator, precision),
  );
};
