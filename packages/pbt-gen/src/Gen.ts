import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenInstanceData, GenResult } from 'pbt-core';
import { GenLike } from './GenLike';
import { addInfiniteStreamProtection, takeWhileInclusive } from './iterableOperators';
import { TreeGenResult } from './ITreeGen';
import { Shrink } from './Shrink';
import { Tree } from './Tree';
import { TreeGen } from './TreeGen';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
  filter: (f: (x: T) => boolean) => Gen<T>;
  flatMap: <U>(k: (x: T) => Gen<U>) => Gen<U>;
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
  const genMap = <U>(f: (x: T) => U): Gen<U> => mapTreeGenToGen<U>(gTree.map(f));

  const genFilter = (f: (x: T) => boolean): Gen<T> => mapTreeGenToGen(gTree.filter(f));

  const genFlatMap = <U>(k: (x: T) => Gen<U>): Gen<U> => mapTreeGenToGen(gTree.flatMap(mapGenKToTreeGenK(k)));

  const genNoShrink = (): Gen<T> => mapTreeGenToGen(gTree.noShrink());

  return Object.assign(mapTreeGenToBaseGen(gTree), {
    map: genMap,
    filter: genFilter,
    flatMap: genFlatMap,
    noShrink: genNoShrink,
  });
};

export const create = <T>(g: GenLike<T>, shrink: Shrink<T>): Gen<T> => {
  const gTree = TreeGen.fromGenLike(g, shrink);
  return mapTreeGenToGen(gTree);
};

export const exhausted = <T>(): Gen<T> => {
  const gTree = TreeGen.of<T>({ kind: 'exhaustion' });
  return mapTreeGenToGen(gTree);
};
