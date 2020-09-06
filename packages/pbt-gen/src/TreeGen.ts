import { of as ofIterable, empty as emptyIterable } from 'ix/iterable';
import { Gen as IGen, GenInstanceData, GenResult } from 'pbt-core';
import { GenLike, mapGenLike } from './GenLike';
import { ITreeGen, TreeGenResult } from './ITreeGen';
import { Shrink } from './Shrink';
import { Tree } from './Tree';

export type TreeGen<T> = ITreeGen<T> & {
  map: <U>(f: (x: T) => U) => TreeGen<U>;
  filter: (f: (x: T) => boolean) => TreeGen<T>;
  flatMap: <U>(k: (x: T) => TreeGen<U>) => TreeGen<U>;
  noShrink: () => TreeGen<T>;
};

const mapTreeGenResult = <T, U>(f: (x: T) => U) => (r: TreeGenResult<T>): TreeGenResult<U> => {
  if (r.kind !== 'instance') return r;

  return {
    kind: 'instance',
    value: Tree.map(r.value, f),
  };
};

const filterTreeGenResult = <T>(f: (x: T) => boolean) => (r: TreeGenResult<T>): TreeGenResult<T> => {
  if (r.kind !== 'instance') return r;

  const [outcome, shrinks] = r.value;
  if (f(outcome) === false) return { kind: 'discard' };

  return {
    kind: 'instance',
    value: Tree.create(outcome, Tree.filterForest(shrinks, f)),
  };
};

const discardShrinks = <T>(r: TreeGenResult<T>): TreeGenResult<T> => {
  if (r.kind !== 'instance') return r;

  const [outcome] = r.value;
  return {
    kind: 'instance',
    value: Tree.create(outcome, emptyIterable()),
  };
};

const extendTreeGen = <T>(treeGenBase: ITreeGen<T>): TreeGen<T> => {
  const map = <U>(f: (x: T) => U): TreeGen<U> => extendTreeGen<U>(mapGenLike(treeGenBase, mapTreeGenResult(f)));

  const filter = (f: (x: T) => boolean): TreeGen<T> =>
    extendTreeGen<T>(mapGenLike(treeGenBase, filterTreeGenResult(f)));

  const flatMap = <U>(k: (x: T) => TreeGen<U>): TreeGen<U> => extendTreeGen<U>(ITreeGen.bind(treeGenBase, k));

  const noShrink = (): TreeGen<T> => extendTreeGen<T>(mapGenLike(treeGenBase, discardShrinks));

  return Object.assign(treeGenBase, { map, filter, flatMap, noShrink });
};

const id = <T>(x: T): T => x;

/* istanbul ignore next */
const toTreeGenResult = <T>(r: GenResult<T>): TreeGenResult<T> => {
  if (r.kind !== 'instance') return r;

  return {
    kind: 'instance',
    value: Tree.unfold<GenInstanceData<T>, T>(
      (r) => r.value,
      (r) => r.shrink(),
      r,
    ),
  };
};

export namespace TreeGen {
  export const fromGenLike = <T>(g: GenLike<T>, shrink: Shrink<T>): TreeGen<T> =>
    extendTreeGen(
      mapGenLike(g, (x) => ({
        kind: 'instance',
        value: Tree.unfold(id, shrink, x),
      })),
    );

  export const fromGen = <T>(g: IGen<T>): TreeGen<T> => {
    return extendTreeGen(mapGenLike(g, toTreeGenResult));
  };

  export const of = <T>(r: TreeGenResult<T>): TreeGen<T> => {
    return extendTreeGen(() => ofIterable(r));
  };
}
