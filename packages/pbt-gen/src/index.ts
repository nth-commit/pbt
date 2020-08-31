import { pipe, empty } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenResult, Seed, Size } from 'pbt-core';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
};

export const create = <T>(g: (seed: Seed, size: Size) => Iterable<T>): Gen<T> => {
  const baseGen: IGen<T> = (seed, size) =>
    map<T, GenResult<T>>((x) => ({
      kind: 'instance',
      value: x,
      shrink: /* istanbul ignore next */ () => empty(),
    }))(g(seed, size));

  const gen: Gen<T> = baseGen as Gen<T>;
  gen.map = null as any;

  return gen;
};

export const integer = (): Gen<number> =>
  create((seed) =>
    pipe(
      Seed.stream(seed),
      map((s) => s.nextInt(0, Number.MAX_SAFE_INTEGER)),
    ),
  );
