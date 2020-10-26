import { Size } from '../Core';
import { CalculateComplexity } from '../GenTree';

export type ScaleMode = 'constant' | 'linear';

export type Bounds = { min: number; max: number };

export namespace Bounds {
  export const create = (x: number, y: number): Bounds => {
    const min = x < y ? x : y;
    const max = y > x ? y : x;
    return { min, max };
  };
}

export type Range = {
  getSizedBounds: (size: Size) => Bounds;
  calculateComplexity: CalculateComplexity<number>;
  origin: number;
  bounds: Bounds;
};

const asProportionOf = (x: number) => (y: number): number => {
  const complexity = x === 0 ? 0 : (y / x) * 100;
  return complexity;
};

export namespace Range {
  const clamp = (min: number, max: number, n: number): number => Math.min(max, Math.max(min, n));

  export const constant = (x: number, y: number): Range => {
    const bounds = Bounds.create(x, y);

    return {
      getSizedBounds: () => bounds,
      calculateComplexity: asProportionOf(bounds.max),
      origin: bounds.min,
      bounds,
    };
  };

  const linear = (x: number, y: number): Range => {
    const bounds = Bounds.create(x, y);

    return {
      getSizedBounds: (size) => {
        const sizeRatio = size / 100;
        const diff = bounds.max - bounds.min;
        const scaledMax = Math.round(diff * sizeRatio) + bounds.min;
        const clamped = clamp(bounds.min, bounds.max, scaledMax);
        return { min: bounds.min, max: clamped };
      },
      calculateComplexity: asProportionOf(bounds.max),
      origin: bounds.min,
      bounds,
    };
  };

  export const createRange = (min: number, max: number, origin: number | null, scale: ScaleMode): Range => {
    switch (scale) {
      case 'constant':
        return constant(min, max);
      case 'linear':
        return linear(min, max);
    }
  };
}
