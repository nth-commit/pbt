import { empty, pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Tree } from '../Core';
import { Gen, GenIteration } from './Gen';

const mapIterations = <T, U>(gen: Gen<T>, f: (genIteration: GenIteration<T>) => GenIteration<U>): Gen<U> => (
  seed,
  size,
) => pipe(gen(seed, size), map(f));

const mapInstances = <T, U>(gen: Gen<T>, f: (genInstance: GenIteration.Instance<T>) => GenIteration<U>): Gen<U> =>
  mapIterations(gen, (genIteration) => (genIteration.kind === 'instance' ? f(genIteration) : genIteration));

const mapTrees = <T, U>(gen: Gen<T>, f: (tree: Tree<T>) => Tree<U>): Gen<U> =>
  mapIterations(gen, (genIteration) => {
    if (genIteration.kind !== 'instance') return genIteration;

    return {
      kind: 'instance',
      tree: f(genIteration.tree),
    };
  });

const filter = <T>(gen: Gen<T>, f: (x: T) => boolean): Gen<T> =>
  mapInstances(gen, (genInstance) => {
    const [outcome, shrinks] = genInstance.tree;
    if (f(outcome) === false) return { kind: 'discard', value: outcome };

    return {
      kind: 'instance',
      tree: Tree.create(outcome, Tree.filterForest(shrinks, f)),
    };
  });

const noShrink = <T>(gen: Gen<T>): Gen<T> => mapTrees(gen, (tree) => Tree.create(Tree.outcome(tree), empty()));

export const operators = {
  mapIterations,
  mapInstances,
  mapTrees,
  filter,
  noShrink,
};
