import { of, pipe, repeatValue } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Seed, Size, GenTree, CalculateComplexity } from './Imports';
import { Shrinker } from './Shrink';

export namespace GenIteration {
  export type Instance<T> = {
    kind: 'instance';
    tree: GenTree<T>;
  };

  export type Discarded = {
    kind: 'discarded';
    value: unknown;
    filteringPredicate: Function;
  };

  export type Exhausted = {
    kind: 'exhausted';
  };

  export const isInstance = <T>(iteration: GenIteration<T>): iteration is Instance<T> => iteration.kind === 'instance';

  export const isNotInstance = <T>(iteration: GenIteration<T>): iteration is Discarded | Exhausted =>
    !isInstance(iteration);
}

export type GenIteration<T> = GenIteration.Instance<T> | GenIteration.Discarded | GenIteration.Exhausted;

export type GenFunction<T> = (seed: Seed, size: Size) => Iterable<GenIteration<T>>;

export namespace GenFunction {
  const id = <T>(x: T): T => x;

  const generateInstance = <T>(
    f: (seed: Seed, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
    size: Size,
  ) => (seed: Seed): GenIteration.Instance<T> => ({
    kind: 'instance',
    tree: GenTree.unfold(f(seed, size), id, shrink, calculateComplexity),
  });

  export const create = <T>(
    f: (seed: Seed, size: Size) => T,
    shrink: Shrinker<T>,
    calculateComplexity: CalculateComplexity<T>,
  ): GenFunction<T> => (seed: Seed, size: Size) =>
    pipe(Seed.stream(seed), map(generateInstance(f, shrink, calculateComplexity, size)));

  export const exhausted = <T>(): GenFunction<T> => () => of<GenIteration.Exhausted>({ kind: 'exhausted' });

  export const constant = <T>(value: T): GenFunction<T> => () =>
    repeatValue<GenIteration.Instance<T>>({
      kind: 'instance',
      tree: {
        node: { value, complexity: 0 },
        shrinks: [],
      },
    });
}
