import { Size } from '../Core';
import { CalculateComplexity } from '../GenTree';

export type ScaleMode = 'constant' | 'linear';

export type Bounds = [min: number, max: number];

export namespace Bounds {
  export const create = (x: number, y: number): Bounds => {
    const min = x < y ? x : y;
    const max = y > x ? y : x;
    return [min, max];
  };
}

export type Range = {
  getSizedBounds: (size: Size) => Bounds;
  getProportionalDistance: (n: number) => number;
  origin: number;
  bounds: Bounds;
};

const asProportionOf = (x: number) => (y: number): number => {
  const complexity = x === 0 ? 0 : (y / x) * 100;
  return complexity;
};

export namespace Range {
  const labelParams = (x: number, y: number, z: number): { min: number; max: number; origin: number } => {
    const [min, origin, max] = [x, y, z].sort((a, b) => a - b);
    return { min, max, origin };
  };

  const scaleLinear = (size: Size, origin: number, max: number): number => {
    const width = max - origin;
    const multiplier = size / 100;
    const diff = Math.round(Math.abs(width) * multiplier) * Math.sign(width);
    return origin + diff;
  };

  const makeGetProportionalDistance = (min: number, max: number, origin: number) => (x: number): number => {
    if (x === origin) return 0;
    if (x === max) return 100;
    if (x === min) return 100;
    if (x < origin) return ((x - origin) / (min - origin)) * 100;
    else return ((x - origin) / (max - origin)) * 100;
  };

  // const clamp = (min: number, max: number, n: number): number => Math.min(max, Math.max(min, n));

  const constantFrom = (x: number, y: number, z: number): Range => {
    const { min, max, origin } = labelParams(x, y, z);

    return {
      getSizedBounds: () => [min, max],
      getProportionalDistance: makeGetProportionalDistance(min, max, origin),
      origin,
      bounds: [min, max],
    };
  };

  const linearFrom = (x: number, y: number, z: number): Range => {
    const { min, max, origin } = labelParams(x, y, z);

    return {
      getSizedBounds: (size) => {
        if (size === 0) return [origin, origin];

        // const min0 = clamp(min, origin, scaleLinear(size, origin, min));
        // const max0 = clamp(max, origin, scaleLinear(size, origin, max));

        const min0 = scaleLinear(size, origin, min);
        const max0 = scaleLinear(size, origin, max);

        return [min0, max0];
      },
      getProportionalDistance: makeGetProportionalDistance(min, max, origin),
      origin,
      bounds: [min, max],
    };
  };

  export const createFrom = (x: number, y: number, z: number, scale: ScaleMode): Range => {
    switch (scale) {
      case 'constant':
        return constantFrom(x, y, z);
      case 'linear':
        return linearFrom(x, y, z);
    }
  };
}
