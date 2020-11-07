import { Rng, Size } from '../Core';
import { GenTree } from '../GenTree';

export namespace GenIteration {
  export type Base = {
    initRng: Rng;
    nextRng: Rng;
    initSize: Size;
    nextSize: Size;
  };

  export type Instance<T> = {
    kind: 'instance';
    tree: GenTree<T>;
  } & Base;

  export type Discard = {
    kind: 'discard';
    value: unknown;
    predicate: Function;
  } & Base;

  export type Error = {
    kind: 'error';
    message: string;
  } & Base;

  export const instance = <T>(
    tree: GenTree<T>,
    initRng: Rng,
    nextRng: Rng,
    initSize: Size,
    nextSize: Size,
  ): Instance<T> => ({
    kind: 'instance',
    tree,
    initRng,
    nextRng,
    initSize,
    nextSize,
  });

  export const discard = (
    value: unknown,
    predicate: Function,
    initRng: Rng,
    nextRng: Rng,
    initSize: Size,
    nextSize: Size,
  ): Discard => ({
    kind: 'discard',
    value,
    predicate,
    initRng,
    nextRng,
    initSize,
    nextSize,
  });

  export const error = (message: string, initRng: Rng, nextRng: Rng, initSize: Size, nextSize: Size): Error => ({
    kind: 'error',
    message,
    initRng,
    nextRng,
    initSize,
    nextSize,
  });

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';
  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discard | Error => !isInstance(iteration);
}

export type GenIteration<T> = GenIteration.Instance<T> | GenIteration.Discard | GenIteration.Error;
