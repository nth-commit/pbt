import { pipe, empty, of } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenInstanceData, GenResult, Seed, Size } from 'pbt-core';
import { Shrink } from './Shrink';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
  filter: (f: (x: T) => boolean) => Gen<T>;
};

const extendWithFunctions = <T>(base: IGen<T>): Gen<T> => {
  const extended = base as Gen<T>;

  const mapGenResults = <U = T>(f: (x: GenResult<T>) => GenResult<U>): Gen<U> =>
    extendWithFunctions((seed, size) => pipe(base(seed, size), map<GenResult<T>, GenResult<U>>(f)));

  extended.map = <U>(f: (x: T) => U): Gen<U> =>
    mapGenResults<U>((r) =>
      /* istanbul ignore next */
      GenResult.isInstance(r)
        ? {
            kind: 'instance',
            value: f(r.value),
            shrink: empty,
          }
        : r,
    );

  extended.filter = (f: (x: T) => boolean) =>
    mapGenResults((r) => (r.kind === 'instance' && f(r.value) ? r : { kind: 'discard' }));

  return extended;
};

export const create = <T>(g: (seed: Seed, size: Size) => Iterable<T>, shrink: Shrink<T>): Gen<T> => {
  const makeInstanceData = (x: T): GenInstanceData<T> => ({
    value: x,
    shrink: () => pipe(shrink(x), map(makeInstanceData)),
  });

  return extendWithFunctions((seed, size) =>
    pipe(
      g(seed, size),
      map<T, GenResult<T>>((x) => ({
        kind: 'instance',
        ...makeInstanceData(x),
      })),
    ),
  );
};
