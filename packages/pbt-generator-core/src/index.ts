export type Seed = number;

export type Size = number;

export type GenInstance<T> = {
  kind: 'instance';
  readonly value: T;
  shrink(): Iterable<GenInstance<T>>;
};

export type GenExhaustion = {
  kind: 'exhaustion';
};

export type GenResult<T> = GenInstance<T> | GenExhaustion;

export interface Gen<T> {
  (seed: Seed, size: Size): Iterable<GenResult<T>>;
}
