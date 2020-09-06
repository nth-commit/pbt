import { pipe, of, empty } from 'ix/iterable';
import { map, flatMap, share } from 'ix/iterable/operators';
import { GenDiscard, GenExhaustion, GenInstance, Seed, Size } from 'pbt-core';
import { GenLike } from './GenLike';
import { Tree } from './Tree';

export type TreeGenInstance<T> = Omit<GenInstance<Tree<T>>, 'shrink'>;

export type TreeGenResult<T> = TreeGenInstance<T> | GenDiscard | GenExhaustion;

export type ITreeGen<T> = GenLike<TreeGenResult<T>>;

export namespace ITreeGen {
  const bindResult = <T, U>(r: TreeGenResult<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
    if (r.kind !== 'instance') return of(r);

    const treeFolder = (outcome0: T, rs: Iterable<TreeGenResult<U>>): Iterable<TreeGenResult<U>> => {
      const treeGenK = k(outcome0);

      return pipe(
        treeGenK(seed, size),
        map(
          (r): TreeGenResult<U> => {
            if (r.kind !== 'instance') return r;

            return { kind: 'exhaustion' };
          },
        ),
      );
    };

    const forestFolder = (rss: Iterable<Iterable<TreeGenResult<U>>>): Iterable<TreeGenResult<U>> =>
      pipe(
        rss,
        flatMap((x) => x),
      );

    return Tree.fold<T, Iterable<TreeGenResult<U>>, Iterable<TreeGenResult<U>>>(r.value, treeFolder, forestFolder);
  };

  export const bind = <T, U>(treeGenBase: ITreeGen<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
    const [leftSeed, rightSeed] = seed.split();
    return pipe(
      treeGenBase(leftSeed, size),
      flatMap((r) => bindResult(r, k)(rightSeed, size)),
    );
  };
}
