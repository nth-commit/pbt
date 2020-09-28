import { concat, empty, of, pipe } from 'ix/iterable';
import { map as mapIterable, filter as filterIterable, flatMap as flatMapIterable } from 'ix/iterable/operators';
import { Tree, takeWhileInclusive as takeWhileInclusiveIterable, Seed } from './Imports';
import { Gen, GenIteration } from './Gen';
import { Shrinker } from './Shrink';

const repeat = <T>(gen: Gen<T>): Gen<T> => (seed, size) =>
  pipe(
    Seed.stream(seed),
    flatMapIterable((seed0) => gen(seed0, size)),
    takeWhileInclusiveIterable((genIteration) => genIteration.kind !== 'exhausted'),
  );

const mapIterations = <T, U>(gen: Gen<T>, f: (genIteration: GenIteration<T>) => GenIteration<U>): Gen<U> => (
  seed,
  size,
) => pipe(gen(seed, size), mapIterable(f));

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

export const map = <T, U>(gen: Gen<T>, f: (x: T) => U): Gen<U> => mapTrees(gen, (tree) => Tree.map(tree, f));

const flatMapInstanceOnce = <T, U>(r: GenIteration.Instance<T>, k: (x: T) => Gen<U>): Gen<U> => (seed, size) => {
  // Given a single instance, runs the gen returned by `k` until it sees another instance. Then, merges the existing
  // instance and the newly generated instance by combining their shrinks, in accordance with `k`. Produces a gen
  // that contains all intermediate non-instance values (e.g. discards or exhaustions), followed by the single
  // successfully bound instance.

  const treeFolder = (outcome0: T, genIterations: Iterable<GenIteration<U>>): Iterable<GenIteration<U>> => {
    const genK = k(outcome0);

    const trees0 = pipe(
      genIterations,
      filterIterable(GenIteration.isInstance),
      mapIterable((genInstance0) => genInstance0.tree),
    );

    return pipe(
      genK(seed, size),
      takeWhileInclusiveIterable(GenIteration.isNotInstance),
      mapIterable((genIteration1) => {
        if (GenIteration.isNotInstance(genIteration1)) return genIteration1;

        const [outcome1, shrinks1] = genIteration1.tree;
        return {
          kind: 'instance',
          tree: Tree.create(outcome1, concat(trees0, shrinks1)),
        };
      }),
    );
  };

  const forestFolder = (rss: Iterable<Iterable<GenIteration<U>>>): Iterable<GenIteration<U>> =>
    pipe(
      rss,
      flatMapIterable((x) => x),
    );

  return Tree.fold<T, Iterable<GenIteration<U>>, Iterable<GenIteration<U>>>(r.tree, treeFolder, forestFolder);
};

const flatMapGenOnce = <T, U>(gen: Gen<T>, k: (x: T) => Gen<U>): Gen<U> => (seed, size) => {
  // Runs the left gen until it finds and instance, then flatMaps that instance by passing it to `flatMapInstanceOnce`.
  // Produces a gen that contains all discarded instances from the left gen and the right gen, followed by the single
  // bound instance.

  const [leftSeed, rightSeed] = seed.split();
  return pipe(
    gen(leftSeed, size),
    flatMapIterable((genIteration) => {
      if (GenIteration.isNotInstance(genIteration)) return of(genIteration);
      return flatMapInstanceOnce(genIteration, k)(rightSeed, size);
    }),
    takeWhileInclusiveIterable(GenIteration.isNotInstance),
  );
};

export const flatMap = <T, U>(gen: Gen<T>, k: (x: T) => Gen<U>): Gen<U> => repeat(flatMapGenOnce(gen, k));

export const filter = <T>(gen: Gen<T>, f: (x: T) => boolean): Gen<T> =>
  mapInstances(gen, (genInstance) => {
    const [outcome, shrinks] = genInstance.tree;
    if (f(outcome) === false) return { kind: 'discarded', value: outcome };

    return {
      kind: 'instance',
      tree: Tree.create(outcome, Tree.filterForest(shrinks, f)),
    };
  });

const reduceOnce = <T, U>(gen: Gen<T>, length: number, f: (acc: U, x: T, i: number) => U, init: U): Gen<U> =>
  function* (seed, size) {
    let reduction = {
      acc: init,
      trees: [] as Array<Tree<T>>,
    };

    for (const result of gen(seed, size)) {
      switch (result.kind) {
        case 'instance':
          const tree = result.tree;
          reduction = {
            acc: f(reduction.acc, tree[0], reduction.trees.length),
            trees: [...reduction.trees, tree],
          };
          break;
        case 'discarded':
        case 'exhausted':
          yield result;
      }

      if (reduction.trees.length >= length) break;
    }

    yield {
      kind: 'instance',
      tree: Tree.map(
        Tree.combine(reduction.trees),
        (xs): U => xs.reduce((acc: U, curr: T, i: number) => f(acc, curr, i), init),
      ),
    };
  };

export const reduce = <T, U>(gen: Gen<T>, length: number, f: (acc: U, x: T, i: number) => U, init: U): Gen<U> =>
  repeat(reduceOnce(gen, length, f, init));

export const noShrink = <T>(gen: Gen<T>): Gen<T> => mapTrees(gen, (tree) => Tree.create(Tree.outcome(tree), empty()));

export const postShrink = <T>(gen: Gen<T>, shrinker: Shrinker<T>): Gen<T> =>
  mapTrees(gen, (tree) => Tree.expand(tree, shrinker));
