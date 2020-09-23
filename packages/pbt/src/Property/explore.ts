import { pipe, from, zip } from 'ix/iterable';
import { Gen, GenIteration, Seed, Size, Tree } from './Imports';
import { PropertyFunction } from './PropertyFunction';
import { PropertyIteration, PropertyIterationFactory, AnyValues, Trees } from './PropertyIteration';
import { Property } from './Property';
import { filter, flatMap, map, tap } from 'ix/iterable/operators';
import { takeWhileInclusive } from '../Gen';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

const runGenUntilFirstInstance = (gen: Gen<unknown>, seed: Seed): Iterable<GenIteration<unknown>> =>
  pipe(
    Seed.stream(seed),
    flatMap((seed0) => gen(seed0, 0)),
    takeWhileInclusive((iteration) => iteration.kind !== 'instance'),
  );

const collectInstancesWithReference = (treesRef: Tree<unknown>[]) => (iteration: GenIteration<unknown>): void => {
  if (iteration.kind === 'instance') {
    treesRef.push(iteration.tree);
  }
};

const runGens = function* <Values extends AnyValues>(
  gens: Gens<Values>,
  seed: Seed,
): Iterable<Trees<Values> | 'discard' | 'exhaustion'> {
  const trees: Tree<unknown>[] = [];

  yield* pipe(
    zip(from(gens), Seed.stream(seed)),
    flatMap(([gen, seed0]) => runGenUntilFirstInstance(gen, seed0)),
    tap(collectInstancesWithReference(trees)),
    filter(GenIteration.isNotInstance),
    map((instance) => instance.kind),
  );

  yield (trees as unknown) as Trees<Values>;
};

const checkIfFalsifiable = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  trees: Trees<Values>,
  propertyIterationFactory: PropertyIterationFactory,
  size: Size,
) => {
  const invocation = PropertyFunction.invoke(f, trees.map(Tree.outcome) as Values);
  return invocation.kind === 'success'
    ? propertyIterationFactory.success(size)
    : propertyIterationFactory.falsification(size, trees, invocation.reason);
};

const exploreUnbounded = function* <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  seed: Seed,
  size: Size,
) {
  let currentSeed = seed;

  while (true) {
    const propertyIterationFactory = PropertyIteration.factory(currentSeed);
    const [leftSeed, rightSeed] = currentSeed.split();

    for (const treesOrFailStatus of runGens(gens, rightSeed)) {
      if (treesOrFailStatus === 'exhaustion') {
        yield propertyIterationFactory.exhaustion(size);
      } else if (treesOrFailStatus === 'discard') {
        yield propertyIterationFactory.discard(size);
      } else {
        yield checkIfFalsifiable(f, treesOrFailStatus, propertyIterationFactory, size);
      }
    }

    currentSeed = leftSeed;
  }
};

export const explore = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
): Property<Values> => (seed, size) =>
  pipe(
    exploreUnbounded(gens, f, seed, size),
    takeWhileInclusive((iteration) => iteration.kind !== 'exhaustion' && iteration.kind !== 'falsification'),
  );
