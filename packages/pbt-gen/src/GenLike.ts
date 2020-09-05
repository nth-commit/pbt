import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Seed, Size } from 'pbt-core';

export type GenLike<T> = (seed: Seed, size: Size) => Iterable<T>;

export const mapGenLike = <T, U>(g: GenLike<T>, f: (x: T) => U): GenLike<U> => (seed, size) =>
  pipe(g(seed, size), map(f));
