import { of, pipe, empty, repeatValue } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Seed, Size, Tree } from './Imports';
import { Shrinker } from './Shrink';

export namespace GenIteration {
  export type Instance<T> = {
    kind: 'instance';
    tree: Tree<T>;
  };

  export type Discarded = {
    kind: 'discarded';
    value: unknown;
  };

  export type Exhausted = {
    kind: 'exhausted';
  };

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';

  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discarded | Exhausted =>
    !isInstance(iteration);
}

export type GenIteration<T> = GenIteration.Instance<T> | GenIteration.Discarded | GenIteration.Exhausted;

export type Gen<T> = (seed: Seed, size: Size) => Iterable<GenIteration<T>>;

const id = <T>(x: T): T => x;

const generateInstance = <T>(f: (seed: Seed, size: Size) => T, shrink: Shrinker<T>, size: Size) => (
  seed: Seed,
): GenIteration.Instance<T> => ({
  kind: 'instance',
  tree: Tree.unfold(id, shrink, f(seed, size)),
});

export const create = <T>(f: (seed: Seed, size: Size) => T, shrink: Shrinker<T>): Gen<T> => (seed: Seed, size: Size) =>
  pipe(Seed.stream(seed), map(generateInstance(f, shrink, size)));

export const exhausted = <T>(): Gen<T> => () => of<GenIteration.Exhausted>({ kind: 'exhausted' });

export const constant = <T>(x: T): Gen<T> => () => {
  const instance: GenIteration.Instance<T> = {
    kind: 'instance',
    tree: Tree.create(x, empty()),
  };
  return repeatValue(instance);
};
