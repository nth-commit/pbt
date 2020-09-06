import { pipe, of, concat } from 'ix/iterable';
import { map, flatMap, filter } from 'ix/iterable/operators';
import { GenDiscard, GenExhaustion, GenInstance } from 'pbt-core';
import { GenLike } from './GenLike';
import { Tree } from './Tree';

export type TreeGenInstance<T> = Omit<GenInstance<Tree<T>>, 'shrink'>;

export type TreeGenResult<T> = TreeGenInstance<T> | GenDiscard | GenExhaustion;

export type ITreeGen<T> = GenLike<TreeGenResult<T>>;

export namespace ITreeGen {
  /* istanbul ignore next */
  const isTreeGenInstance = <T>(r: TreeGenResult<T>): r is TreeGenInstance<T> => r.kind === 'instance';

  const bindResult = <T, U>(r: TreeGenResult<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
    if (r.kind !== 'instance') return of(r);

    const treeFolder = (outcome0: T, rs: Iterable<TreeGenResult<U>>): Iterable<TreeGenResult<U>> => {
      const treeGenK = k(outcome0);

      const values0 = pipe(
        rs,
        filter(isTreeGenInstance),
        map(/* istanbul ignore next */ (r0) => r0.value),
      );

      return pipe(
        treeGenK(seed, size),
        map(
          (r1): TreeGenResult<U> => {
            /* istanbul ignore else */
            if (r1.kind !== 'instance') return r1;

            /* istanbul ignore next */
            const [outcome1, values1] = r1.value;
            /* istanbul ignore next */
            return {
              kind: 'instance',
              value: Tree.create(outcome1, concat(values0, values1)),
            };
          },
        ),
      );
    };

    const forestFolder = (rss: Iterable<Iterable<TreeGenResult<U>>>): Iterable<TreeGenResult<U>> =>
      pipe(
        rss,
        flatMap(/* istanbul ignore next */ (x) => x),
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
