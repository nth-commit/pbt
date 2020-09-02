import { pipe, empty } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenResult, Seed, Size } from 'pbt-core';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
};

const extendWithFunctions = <T>(base: IGen<T>): Gen<T> => {
  const extended = base as Gen<T>;

  extended.map = <U>(f: (x: T) => U): Gen<U> =>
    extendWithFunctions((seed, size) =>
      pipe(
        base(seed, size),
        map<GenResult<T>, GenResult<U>>((r) =>
          /* istanbul ignore next */
          GenResult.isInstance(r)
            ? {
                kind: 'instance',
                value: f(r.value),
                shrink: empty,
              }
            : r,
        ),
      ),
    );

  return extended;
};

export const create = <T>(g: (seed: Seed, size: Size) => Iterable<T>): Gen<T> =>
  extendWithFunctions((seed, size) =>
    pipe(
      g(seed, size),
      map<T, GenResult<T>>((x) => ({
        kind: 'instance',
        value: x,
        shrink: empty,
      })),
    ),
  );
