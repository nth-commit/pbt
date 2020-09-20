import { empty, of, pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Seed, Size } from './Imports';
import { Shrinker } from './Shrink';
import { Tree } from './Tree';
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

const mapGenIterable = <T, U>(gen: Gen<T>, f: (genIteration: GenIteration<T>) => GenIteration<U>): Gen<U> => (
  seed,
  size,
) => pipe(gen(seed, size), map(f));

export const create = <T>(f: (seed: Seed, size: Size) => T, shrink: Shrinker<T>): Gen<T> => (seed: Seed, size: Size) =>
  pipe(SeedExtensions.stream(seed), map(generateInstance(f, shrink, size)));

export const exhausted = <T>(): Gen<T> => () => of({ kind: 'exhausted' });

export const noShrink = <T>(gen: Gen<T>): Gen<T> =>
  mapGenIterable(gen, (genIteration) => {
    if (genIteration.kind !== 'instance') return genIteration;

    return {
      kind: 'instance',
      tree: Tree.create(Tree.outcome(genIteration.tree), empty()),
    };
  });
