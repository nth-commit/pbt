export type Seed = number;

export type Size = number;

export type GenInstance<T> = {
  readonly value: T;
  shrink(): Iterable<GenInstance<T>>;
};

export interface Gen<T> {
  (seed: Seed, size: Size): Iterable<GenInstance<T>>;
}
