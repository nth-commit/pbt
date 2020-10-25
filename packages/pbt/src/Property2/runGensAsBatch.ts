import { pipe, from, zip } from 'ix/iterable';
import { Gen, GenIteration, Seed, Size, GenTree, Shrink } from './Imports';
import { filter, flatMap, map, tap } from 'ix/iterable/operators';
import { takeWhileInclusive } from '../Gen';
import { AnyValues } from './Property';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

type GenTrees<Values extends AnyValues> = { [P in keyof Values]: GenTree<Values[P]> };

const runGenUntilFirstInstance = (gen: Gen<unknown>, seed: Seed, size: Size): Iterable<GenIteration<unknown>> =>
  pipe(
    Seed.stream(seed),
    flatMap((seed0) => gen.run(seed0, size)),
    takeWhileInclusive((iteration) => iteration.kind !== 'instance'),
  );

const collectInstancesWithReference = (treesRef: GenTree<unknown>[]) => (iteration: GenIteration<unknown>): void => {
  if (iteration.kind === 'instance') {
    treesRef.push(iteration.tree);
  }
};

export const runGensAsBatch = function* <Values extends AnyValues>(
  gens: Gens<Values>,
  seed: Seed,
  size: Size,
): Iterable<GenTree<Values> | 'discarded' | 'exhausted'> {
  const trees: GenTree<unknown>[] = [];

  yield* pipe(
    zip(from(gens), Seed.stream(seed)),
    flatMap(([gen, seed0]) => runGenUntilFirstInstance(gen, seed0, size)),
    tap(collectInstancesWithReference(trees)),
    filter(GenIteration.isNotInstance),
    map((instance) => instance.kind),
  );

  yield GenTree.concat((trees as unknown) as GenTrees<Values>, (xs) => xs, Shrink.none()) as GenTree<Values>;
};
