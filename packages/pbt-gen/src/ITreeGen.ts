import { pipe, of } from 'ix/iterable';
import { flatMap } from 'ix/iterable/operators';
import { GenDiscard, GenExhaustion, GenInstance, Seed, Size } from 'pbt-core';
import { GenLike } from './GenLike';
import { Tree } from './Tree';

export type TreeGenInstance<T> = Omit<GenInstance<Tree<T>>, 'shrink'>;

export type TreeGenResult<T> = TreeGenInstance<T> | GenDiscard | GenExhaustion;

export type ITreeGen<T> = GenLike<TreeGenResult<T>>;

export namespace ITreeGen {
  const bindResult = <T, U>(r: TreeGenResult<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
    return of<TreeGenResult<U>>({ kind: 'exhaustion' });
  };

  export const bind = <T, U>(treeGenBase: ITreeGen<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
    const [leftSeed, rightSeed] = seed.split();
    return pipe(
      treeGenBase(leftSeed, size),
      flatMap((r) => bindResult(r, k)(rightSeed, size)),
    );
  };
}
