import { Size } from 'pbt-core';

export type Range = {
  getSizedBounds: (size: Size) => [min: number, max: number];
  origin: number;
};

export namespace Range {
  const sort = (x: number, y: number): [min: number, max: number] => {
    const min = x < y ? x : y;
    const max = y > x ? y : x;
    return [min, max];
  };

  const clamp = (min: number, max: number, n: number): number => Math.min(max, Math.max(min, n));

  export const constant = (x: number, y: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: () => [min, max],
      origin: min,
    };
  };

  export const linear = (x: number, y: number): Range => {
    const [min, max] = sort(x, y);

    return {
      getSizedBounds: (size) => {
        const sizeRatio = size / 100;
        const diff = max - min;
        const scaledMax = Math.round(diff * sizeRatio) + min;
        const clamped = clamp(min, max, scaledMax);
        return [min, clamped];
      },
      origin: min,
    };
  };
}
