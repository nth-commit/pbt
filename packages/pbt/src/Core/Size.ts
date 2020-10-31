export type Size = number;

const arrayRange = (startIndex: number, endIndex: number): number[] =>
  [...Array(endIndex).keys()].map((x) => x + startIndex);

export namespace Size {
  export const MAX_SIZE = 100;

  export const increment = (size: Size): Size => (size + 1) % MAX_SIZE;

  export const bigIncrement = (size: Size): Size => arrayRange(1, 10).reduce((size0) => Size.increment(size0), size);
}
