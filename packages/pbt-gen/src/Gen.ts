import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenInstanceData, GenResult } from 'pbt-core';
import { GenLike } from './GenLike';
import { addInfiniteStreamProtection } from './iterableOperators';
import { Shrink } from './Shrink';
import { Tree } from './Tree';
import { fromGenLike, fromGen, TreeGen, TreeGenResult } from './TreeGen';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
  filter: (f: (x: T) => boolean) => Gen<T>;
  flatMap: <U>(k: (x: T) => Gen<U>) => Gen<U>;
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
  pipe(gTree(seed, size), addInfiniteStreamProtection(), map(mapTreeGenResultToGenResult));

const mapGenKToTreeGenK = <T, U>(k: (x: T) => Gen<U>) => (x: T): TreeGen<U> => fromGen<U>(k(x));

const mapTreeGenToGen = <T>(gTree: TreeGen<T>): Gen<T> => {
  const map = <U>(f: (x: T) => U): Gen<U> => mapTreeGenToGen<U>(gTree.map(f));

  const filter = (f: (x: T) => boolean): Gen<T> => mapTreeGenToGen(gTree.filter(f));

  const flatMap = <U>(k: (x: T) => Gen<U>): Gen<U> => mapTreeGenToGen(gTree.flatMap(mapGenKToTreeGenK(k)));

  return Object.assign(mapTreeGenToBaseGen(gTree), { map, filter, flatMap });
};

export const create = <T>(g: GenLike<T>, shrink: Shrink<T>): Gen<T> => {
  const gTree = fromGenLike(g, shrink);
  return mapTreeGenToGen(gTree);
};
