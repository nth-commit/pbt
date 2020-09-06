import { of } from 'ix/iterable';
import { Gen as IGen, GenDiscard, GenExhaustion, GenInstance, GenInstanceData, GenResult, Seed, Size } from 'pbt-core';
import { GenLike, mapGenLike } from './GenLike';
import { Shrink } from './Shrink';
import { Tree } from './Tree';

export type TreeGenInstance<T> = Omit<GenInstance<Tree<T>>, 'shrink'>;

export type TreeGenResult<T> = TreeGenInstance<T> | GenDiscard | GenExhaustion;

export type ITreeGen<T> = (seed: Seed, size: Size) => Iterable<TreeGenResult<T>>;

export type TreeGen<T> = ITreeGen<T> & {
  map: <U>(f: (x: T) => U) => TreeGen<U>;
  filter: (f: (x: T) => boolean) => TreeGen<T>;
  flatMap: <U>(k: (x: T) => TreeGen<U>) => TreeGen<U>;
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

const extendTreeGen = <T>(gTreeBase: ITreeGen<T>): TreeGen<T> => {
  const map = <U>(f: (x: T) => U): TreeGen<U> => extendTreeGen<U>(mapGenLike(gTreeBase, mapTreeGenResult(f)));

  const filter = (f: (x: T) => boolean): TreeGen<T> => extendTreeGen<T>(mapGenLike(gTreeBase, filterTreeGenResult(f)));

  const flatMap = <U>(k: (x: T) => TreeGen<U>): TreeGen<U> => extendTreeGen<U>(() => of({ kind: 'exhaustion' }));

  return Object.assign(gTreeBase, { map, filter, flatMap });
};

const id = <T>(x: T): T => x;

export const fromGenLike = <T>(g: GenLike<T>, shrink: Shrink<T>): TreeGen<T> =>
  extendTreeGen(
    mapGenLike(g, (x) => ({
      kind: 'instance',
      value: Tree.unfold(id, shrink, x),
    })),
  );

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

export const fromGen = <T>(g: IGen<T>): TreeGen<T> => {
  return extendTreeGen(mapGenLike(g, toTreeGenResult));
};
