import { GenDiscard, GenExhaustion, GenInstance } from 'pbt-core';
import { Tree } from './Tree';

export type TreeGenInstance<T> = Omit<GenInstance<Tree<T>>, 'shrink'>;

export type TreeGenResult<T> = TreeGenInstance<T> | GenDiscard | GenExhaustion;

export namespace TreeGenResult {
  export const isInstance = <T>(r: TreeGenResult<T>): r is TreeGenInstance<T> => r.kind === 'instance';

  export const isNotInstance = <T>(r: TreeGenResult<T>): r is GenDiscard | GenExhaustion => !isInstance(r);

  export const mapTreeInstance = <T, U>(r: TreeGenResult<T>, f: (x: Tree<T>) => Tree<U>): TreeGenResult<U> =>
    isInstance(r) ? { kind: 'instance', value: f(r.value) } : r;
}
