import { RawGenImpl } from './RawGenImpl';
import { Gen } from '../Gen';
import { GenRunnable } from '../GenRunnable';
import { IntegralGen, IntegralGenConfig } from './IntegralGen';
import { Calculator, Integer, ScaleMode } from '../../Number';
import { Result } from '../../Core';

export type IntegerGen<TNumber> = Gen<number> & {
  between(min: number, max: number): IntegerGen<TNumber>;
  greaterThanEqual(min: number): IntegerGen<TNumber>;
  lessThanEqual(max: number): IntegerGen<TNumber>;
  origin(origin: number): IntegerGen<TNumber>;
  noBias(): IntegerGen<TNumber>;
};

export const IntegerGen = {
  create: <TNumber>(calculator: Calculator<TNumber>): IntegerGen<TNumber> => {
    class IntegerGenImpl extends RawGenImpl<number> implements IntegerGen<TNumber> {
      constructor(private readonly config: Readonly<IntegerGenConfig>) {
        super(GenRunnable.delay(() => integralGen(calculator, config)));
      }

      greaterThanEqual(min: number): IntegerGen<TNumber> {
        return this.withConfig({ min });
      }

      lessThanEqual(max: number): IntegerGen<TNumber> {
        return this.withConfig({ max });
      }

      between(min: number, max: number): IntegerGen<TNumber> {
        return this.withConfig({ min, max });
      }

      origin(origin: number): IntegerGen<TNumber> {
        return this.withConfig({ origin });
      }

      noBias(): IntegerGen<TNumber> {
        return this.withConfig({ scale: 'constant' });
      }

      private withConfig(config: Partial<IntegerGenConfig>): IntegerGen<TNumber> {
        return new IntegerGenImpl({
          ...this.config,
          ...config,
        });
      }
    }

    return new IntegerGenImpl({
      min: null,
      max: null,
      origin: null,
      scale: null,
    });
  },
};

type IntegerGenConfig = Readonly<{
  min: number | null;
  max: number | null;
  origin: number | null;
  scale: ScaleMode | null;
}>;

const integralGen = <TNumber>(calculator: Calculator<TNumber>, args: IntegerGenConfig): Gen<number> =>
  toIntegralGenConfig(calculator, args)
    .map((config) => IntegralGen.create(calculator, config))
    .map((gen) => gen.map(calculator.unloadInteger))
    .mapError<Gen<number>>(Gen.error)
    .flatten();

const toIntegralGenConfig = <TNumber>(
  calculator: Calculator<TNumber>,
  integerGenConfig: IntegerGenConfig,
): Result<IntegralGenConfig<TNumber>, string> =>
  Result.concat3(
    validateMin(calculator, integerGenConfig.min),
    validateMax(calculator, integerGenConfig.max),
    validateOrigin(calculator, integerGenConfig.origin),
  ).map(([min, max, origin]) => {
    return {
      min,
      max,
      origin,
      scale: integerGenConfig.scale,
    };
  });

const validateMin = <TNumber>(
  calculator: Calculator<TNumber>,
  min: number | null,
): Result<Integer<TNumber> | null, string> => {
  if (min === null) return Result.ofValue(null);
  return calculator.loadInteger(min).mapError(() => `Minimum must be an integer, min = ${min}`);
};

const validateMax = <TNumber>(
  calculator: Calculator<TNumber>,
  max: number | null,
): Result<Integer<TNumber> | null, string> => {
  if (max === null) return Result.ofValue(null);
  return calculator.loadInteger(max).mapError(() => `Maximum must be an integer, max = ${max}`);
};

const validateOrigin = <TNumber>(
  calculator: Calculator<TNumber>,
  origin: number | null,
): Result<Integer<TNumber> | null, string> => {
  if (origin === null) return Result.ofValue(null);
  return calculator.loadInteger(origin).mapError(() => `Origin must be an integer, origin = ${origin}`);
};
