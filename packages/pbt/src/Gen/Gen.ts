import { of, pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Tree } from '../Core';
import { Seed, Size } from './Imports';
import { Shrinker } from './Shrink';
import * as SeedExtensions from './SeedExtensions';

export namespace GenIteration {
  export type Instance<T> = {
    kind: 'instance';
    tree: Tree<T>;
  };

  export type Discard = {
    kind: 'discard';
    value: unknown;
  };

  export type Exhausted = {
    kind: 'exhausted';
  };

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';

  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discard | Exhausted =>
    !isInstance(iteration);
}

export type GenIteration<T> = GenIteration.Instance<T> | GenIteration.Discard | GenIteration.Exhausted;

export type Gen<T> = (seed: Seed, size: Size) => Iterable<GenIteration<T>>;

const id = <T>(x: T): T => x;

const generateInstance = <T>(f: (seed: Seed, size: Size) => T, shrink: Shrinker<T>, size: Size) => (
  seed: Seed,
): GenIteration.Instance<T> => ({
  kind: 'instance',
  tree: Tree.unfold(id, shrink, f(seed, size)),
});

export const create = <T>(f: (seed: Seed, size: Size) => T, shrink: Shrinker<T>): Gen<T> => (seed: Seed, size: Size) =>
  pipe(SeedExtensions.stream(seed), map(generateInstance(f, shrink, size)));

export const exhausted = <T>(): Gen<T> => () => of({ kind: 'exhausted' });
