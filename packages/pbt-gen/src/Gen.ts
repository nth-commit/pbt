import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenInstanceData, GenResult, Seed, Size } from 'pbt-core';
import { GenLike } from './GenLike';
import { addInfiniteStreamProtection, takeWhileInclusive } from './iterableOperators';
import { Shrink } from './Shrink';
import { Tree } from './Tree';
import { TreeGen } from './TreeGen';
import { TreeGenResult } from './TreeGenResult';
import * as SeedExtensions from './SeedExtensions';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
  filter: (f: (x: T) => boolean) => Gen<T>;
  flatMap: <U>(k: (x: T) => Gen<U>) => Gen<U>;
  reduce: <U>(length: number, f: (acc: U, x: T, i: number) => U, init: U) => Gen<U>;
  noShrink: () => Gen<T>;
};

const mapTreeToInstanceData = <T>([outcome, shrinks]: Tree<T>): GenInstanceData<T> => ({
  value: outcome,
  shrink: () => pipe(shrinks, map(mapTreeToInstanceData)),
});

const mapTreeGenResultToGenResult = <T>(r: TreeGenResult<T>): GenResult<T> =>
  r.kind === 'instance'
    ? {
        kind: 'instance',
        ...mapTreeToInstanceData(r.value),
      }
    : r;

const mapTreeGenToBaseGen = <T>(gTree: TreeGen<T>): IGen<T> => (seed, size) =>
  pipe(
    gTree(seed, size),
    takeWhileInclusive((r) => r.kind !== 'exhaustion'),
    addInfiniteStreamProtection(),
    map(mapTreeGenResultToGenResult),
  );

const mapGenKToTreeGenK = <T, U>(k: (x: T) => Gen<U>) => (x: T): TreeGen<U> => TreeGen.fromGen<U>(k(x));

const mapTreeGenToGen = <T>(gTree: TreeGen<T>): Gen<T> => {
  const mapGen = <U>(f: (x: T) => U): Gen<U> => mapTreeGenToGen<U>(gTree.map(f));

  const filterGen = (f: (x: T) => boolean): Gen<T> => mapTreeGenToGen(gTree.filter(f));

  const flatMapGen = <U>(k: (x: T) => Gen<U>): Gen<U> => mapTreeGenToGen(gTree.flatMap(mapGenKToTreeGenK(k)));

  const reduceGen = <U>(length: number, f: (acc: U, x: T, i: number) => U, init: U): Gen<U> =>
    mapTreeGenToGen(gTree.reduce(length, f, init));

  const noShrinkGen = (): Gen<T> => mapTreeGenToGen(gTree.noShrink());

  return Object.assign(mapTreeGenToBaseGen(gTree), {
    map: mapGen,
    filter: filterGen,
    flatMap: flatMapGen,
    reduce: reduceGen,
    noShrink: noShrinkGen,
  });
};

export const stream = <T>(g: GenLike<T>, shrink: Shrink<T>): Gen<T> => {
  const gTree = TreeGen.fromGenLike(g, shrink);
  return mapTreeGenToGen(gTree);
};

export const create = <T>(f: (seed: Seed, size: Size) => T, shrink: Shrink<T>): Gen<T> =>
  stream(
    (seed, size) =>
      pipe(
        SeedExtensions.stream(seed),
        map((seed0) => f(seed0, size)),
      ),
    shrink,
  );

export const exhausted = <T>(): Gen<T> => {
  const gTree = TreeGen.exhausted<T>();
  return mapTreeGenToGen(gTree);
};
