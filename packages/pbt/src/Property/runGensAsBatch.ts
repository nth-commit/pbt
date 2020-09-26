import { pipe, from, zip } from 'ix/iterable';
import { Gen, GenIteration, Seed, Size, Tree } from './Imports';
import { AnyValues } from './PropertyIteration';
import { filter, flatMap, map, tap } from 'ix/iterable/operators';
import { takeWhileInclusive } from '../Gen';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

type Trees<Values extends AnyValues> = { [P in keyof Values]: Tree<Values[P]> };

const runGenUntilFirstInstance = (gen: Gen<unknown>, seed: Seed, size: Size): Iterable<GenIteration<unknown>> =>
  pipe(
    Seed.stream(seed),
    flatMap((seed0) => gen(seed0, size)),
    takeWhileInclusive((iteration) => iteration.kind !== 'instance'),
  );

const collectInstancesWithReference = (treesRef: Tree<unknown>[]) => (iteration: GenIteration<unknown>): void => {
  if (iteration.kind === 'instance') {
    treesRef.push(iteration.tree);
  }
};

export const runGensAsBatch = function* <Values extends AnyValues>(
  gens: Gens<Values>,
  seed: Seed,
  size: Size,
): Iterable<Tree<Values> | 'discard' | 'exhaustion'> {
  const trees: Tree<unknown>[] = [];

  yield* pipe(
    zip(from(gens), Seed.stream(seed)),
    flatMap(([gen, seed0]) => runGenUntilFirstInstance(gen, seed0, size)),
    tap(collectInstancesWithReference(trees)),
    filter(GenIteration.isNotInstance),
    map((instance) => instance.kind),
  );

  yield Tree.combine((trees as unknown) as Trees<Values>) as Tree<Values>;
};
