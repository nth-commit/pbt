import { GenFactory, IntegerGen } from '../Abstractions';
import { GenImpl } from './GenImpl';
import { Range, ScaleMode } from '../Range';
import { Shrink } from '../Shrink';
import { GenStreamer, GenStreamerTransformation } from '../GenStream';

const MAX_INT_32 = Math.pow(2, 31);
const MIN_INT_32 = -MAX_INT_32;

type IntegerGenConfig = Readonly<{
  min: number | null;
  max: number | null;
  origin: number | null;
  scale: ScaleMode | null;
}>;

export const integer = (genFactory: GenFactory): IntegerGen => {
  class IntegerGenImpl extends GenImpl<number> implements IntegerGen {
    constructor(private readonly config: Readonly<IntegerGenConfig>) {
      super(() => integerStreamer(config), GenStreamerTransformation.none(), genFactory);
    }

    greaterThanEqual(min: number): IntegerGen {
      return this.withConfig({ min });
    }

    lessThanEqual(max: number): IntegerGen {
      return this.withConfig({ max });
    }

    between(min: number, max: number): IntegerGen {
      return this.withConfig({ min, max });
    }

    origin(origin: number): IntegerGen {
      return this.withConfig({ origin });
    }

    noBias(): IntegerGen {
      return this.withConfig({ scale: 'constant' });
    }

    private withConfig(config: Partial<IntegerGenConfig>): IntegerGen {
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
};

const integerStreamer = (args: IntegerGenConfig): GenStreamer<number> => {
  const min = tryDeriveMin(args.min);
  if (typeof min === 'string') {
    return GenStreamer.error(min);
  }

  const max = tryDeriveMax(args.max);
  if (typeof max === 'string') {
    return GenStreamer.error(max);
  }

  const origin = tryDeriveOrigin(min, max, args.origin);
  if (typeof origin === 'string') {
    return GenStreamer.error(origin);
  }

  const scale = args.scale === null ? 'linear' : args.scale;
  const range = Range.createFrom(min, max, origin, scale);

  return GenStreamerTransformation.repeat<number>()(
    GenStreamer.create(
      (useNextInt, size) => useNextInt(...range.getSizedBounds(size)),
      Shrink.towardsNumber(range.origin),
      range.getProportionalDistance,
    ),
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

const isBetween = (x: number, y: number, n: number) => (x <= n && n <= y) || (y <= n && n <= x);
