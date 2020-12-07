import { GenFactory, GenLite, FloatGen } from '../Abstractions';
import { Range, ScaleMode } from '../Range';
import { Shrink } from '../Shrink';
import { RawGenImpl } from './RawGenImpl';
import { GenTransformation } from './GenTransformation';
import { primitive } from './PrimitiveGen';

const FLOAT_BITS = 16;
const DEFAULT_MIN_PRECISION = 0;
const DEFAULT_MAX_PRECISION = 16;
const MAX_INT_32 = Math.pow(2, 31);

type FloatGenConfig = Readonly<{
  min: number | null;
  max: number | null;
  origin: number | null;
  minPrecision: number | null;
  maxPrecision: number | null;
  scale: ScaleMode | null;
}>;

export const float = (genFactory: GenFactory): FloatGen => {
  class FloatGenImpl extends RawGenImpl<number> implements FloatGen {
    constructor(private readonly config: Readonly<FloatGenConfig>) {
      super(floatGen(config, genFactory), genFactory);
    }

    /* istanbul ignore next */
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

    /* istanbul ignore next */
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
      return this.withConfig({ scale: 'constant' });
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
    scale: null,
  });
};

const floatGen = (args: FloatGenConfig, genFactory: GenFactory): GenLite<number> => {
  const minPrecision = tryDeriveMinPrecision(args.minPrecision);
  if (typeof minPrecision === 'string') {
    return genFactory.error(minPrecision);
  }

  const maxPrecision = tryDeriveMaxPrecision(args.maxPrecision);
  if (typeof maxPrecision === 'string') {
    return genFactory.error(maxPrecision);
  }

  const min = tryDeriveMin(args.min, minPrecision, maxPrecision);
  if (typeof min === 'string') {
    return genFactory.error(min);
  }

  const max = tryDeriveMax(args.max, minPrecision, maxPrecision);
  if (typeof max === 'string') {
    return genFactory.error(max);
  }

  return genFactory.error('Not implemented');
};

const tryDeriveMinPrecision = (minPrecision: number | null): number | string => {
  if (minPrecision === null) {
    return DEFAULT_MIN_PRECISION;
  }

  if (Number.isInteger(minPrecision) === false) {
    return `Minimum precision must be an integer, minPrecision = ${minPrecision}`;
  }

  if (minPrecision < 0) {
    return `Minimum precision must be non-negative, minPrecision = ${minPrecision}`;
  }

  if (minPrecision > FLOAT_BITS) {
    return `Minimum precision must not exceed ${FLOAT_BITS} (floating point precision), minPrecision = ${minPrecision}`;
  }

  return minPrecision;
};

const tryDeriveMaxPrecision = (maxPrecision: number | null): number | string => {
  if (maxPrecision === null) {
    return DEFAULT_MAX_PRECISION;
  }

  if (Number.isInteger(maxPrecision) === false) {
    return `Maximum precision must be an integer, maxPrecision = ${maxPrecision}`;
  }

  if (maxPrecision < 0) {
    return `Maximum precision must be non-negative, maxPrecision = ${maxPrecision}`;
  }

  if (maxPrecision > FLOAT_BITS) {
    return `Maximum precision must not exceed ${FLOAT_BITS} (floating point precision), maxPrecision = ${maxPrecision}`;
  }

  return maxPrecision;
};

const tryDeriveMin = (min: number | null, minPrecision: number, maxPrecision: number): number | string => {
  if (min === null) return -MAX_INT_32;

  const precisionOfMin = measurePrecision(min);
  if (precisionOfMin > maxPrecision) {
    return `Bound must be within precision range, minPrecision = ${minPrecision}, maxPrecision = ${maxPrecision}, min = ${min}`;
  }

  const precisionMagnitude = magnitudeOfPrecision(minPrecision);
  if (min < -precisionMagnitude) {
    return `Bound violates minimum precision constraint, minPrecision = ${minPrecision}, minMin = -${precisionMagnitude}, receivedMin = ${min}`;
  }

  return min;
};

const tryDeriveMax = (max: number | null, minPrecision: number, maxPrecision: number): number | string => {
  if (max === null) return MAX_INT_32;

  const precisionOfMax = measurePrecision(max);
  if (precisionOfMax > maxPrecision) {
    return `Bound must be within precision range, minPrecision = ${minPrecision}, maxPrecision = ${maxPrecision}, max = ${max}`;
  }

  const precisionMagnitude = magnitudeOfPrecision(minPrecision);
  if (max > precisionMagnitude) {
    return `Bound violates minimum precision constraint, minPrecision = ${minPrecision}, maxMax = ${precisionMagnitude}, receivedMax = ${max}`;
  }

  return max;
};

const measurePrecision = (x: number): number => {
  const xStr = x.toPrecision(1);
  const match = xStr.match(/e-(\d+)/);

  /*istanbul ignore next */
  if (match !== null) {
    return Number(match[1]);
  }

  let count = 0;
  x = Math.abs(x);

  while (x % 1 > 0) {
    count++;
    x = x * 10;

    /*istanbul ignore next */
    if (count > 100) {
      throw new Error(`Fatal: Exceeded calculation limit whilst measuring precision, x = ${x}`);
    }
  }

  return count;
};

const unitOfPrecision = (precision: number): number => Math.pow(10, -precision);

const magnitudeOfPrecision = (precision: number): number => {
  if (precision === 0) return Infinity;
  const max = Math.pow(10, FLOAT_BITS - precision) - unitOfPrecision(precision);
  return max;
};
