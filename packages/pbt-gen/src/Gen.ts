import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen as IGen, GenInstanceData } from 'pbt-core';
import { GenLike, mapGenLike } from './GenLike';
import { Shrink } from './Shrink';
import { Tree } from './Tree';
import { createTreeGen, TreeGen } from './TreeGen';

export type Gen<T> = IGen<T> & {
  map: <U>(f: (x: T) => U) => Gen<U>;
  filter: (f: (x: T) => boolean) => Gen<T>;
};

const mapTreeToInstanceData = <T>([outcome, shrinks]: Tree<T>): GenInstanceData<T> => ({
  value: outcome,
  shrink: () => pipe(shrinks, map(mapTreeToInstanceData)),
});

const mapTreeGenToBaseGen = <T>(gTree: TreeGen<T>): IGen<T> =>
  mapGenLike(gTree, (r) =>
    r.kind === 'instance'
      ? {
          kind: 'instance',
          ...mapTreeToInstanceData(r.value),
        }
      : r,
  );

const mapTreeGenToGen = <T>(gTree: TreeGen<T>): Gen<T> => {
  const map = <U>(f: (x: T) => U): Gen<U> => mapTreeGenToGen<U>(gTree.map(f));

  const filter = (f: (x: T) => boolean): Gen<T> => mapTreeGenToGen(gTree.filter(f));

  return Object.assign(mapTreeGenToBaseGen(gTree), { map, filter });
};

export const create = <T>(g: GenLike<T>, shrink: Shrink<T>): Gen<T> => {
  const gTree = createTreeGen(g, shrink);
  return mapTreeGenToGen(gTree);
};
