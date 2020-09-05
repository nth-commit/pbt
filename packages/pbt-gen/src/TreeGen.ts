import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { GenDiscard, GenExhaustion, GenInstance, Seed, Size } from 'pbt-core';
import { GenLike, mapGenLike } from './GenLike';
import { Shrink } from './Shrink';
import { Tree } from './Tree';

type GenInstanceBeforeShrink<T> = Omit<GenInstance<T>, 'shrink'>;

type GenResultBeforeShrink<T> = GenInstanceBeforeShrink<T> | GenDiscard | GenExhaustion;

/*istanbul ignore next */
const mapGenResultBeforeShrink = <T, U>(r: GenResultBeforeShrink<T>, f: (x: T) => U): GenResultBeforeShrink<U> =>
  r.kind === 'instance'
    ? {
        kind: 'instance',
        value: f(r.value),
      }
    : r;

/*istanbul ignore next */
const bindGenResultBeforeShrink = <T, U>(
  r: GenResultBeforeShrink<T>,
  k: (x: T) => GenResultBeforeShrink<U>,
): GenResultBeforeShrink<U> => (r.kind === 'instance' ? k(r.value) : r);

type ITreeGen<T> = (seed: Seed, size: Size) => Iterable<GenResultBeforeShrink<Tree<T>>>;

export type TreeGen<T> = ITreeGen<T> & {
  map: <U>(f: (x: T) => U) => TreeGen<U>;
  filter: (f: (x: T) => boolean) => TreeGen<T>;
};

const extendTreeGen = <T>(gTreeBase: ITreeGen<T>): TreeGen<T> => {
  const map = <U>(f: (x: T) => U): TreeGen<U> =>
    extendTreeGen<U>(mapGenLike(gTreeBase, (r) => mapGenResultBeforeShrink(r, (tree) => Tree.map(tree, f))));

  const filter = (f: (x: T) => boolean): TreeGen<T> =>
    extendTreeGen<T>(
      mapGenLike(
        gTreeBase,
        (r) => bindGenResultBeforeShrink(r, (tree) => (f(tree[0]) ? r : { kind: 'discard' })), // TODO: Filter shrinks
      ),
    );

  return Object.assign(gTreeBase, { map, filter });
};

const id = <T>(x: T): T => x;

export const createTreeGen = <T>(g: GenLike<T>, shrink: Shrink<T>): TreeGen<T> =>
  extendTreeGen(
    mapGenLike(g, (x) => ({
      kind: 'instance',
      value: Tree.unfold(id, shrink, x),
    })),
  );
