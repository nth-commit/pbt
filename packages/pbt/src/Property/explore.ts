import { pipe } from 'ix/iterable';
import { Gen, Seed, Size, Tree } from './Imports';
import { PropertyFunction } from './PropertyFunction';
import { PropertyExplorationIteration, PropertyIterationFactory, AnyValues } from './PropertyIteration';
import { takeWhileInclusive } from '../Gen';
import { runGensAsBatch } from './runGensAsBatch';

export type PropertyExploration<Values extends AnyValues> = (
  seed: Seed,
  size: Size,
) => Iterable<PropertyExplorationIteration<Values>>;

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

const checkIfFalsifiable = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  tree: Tree<Values>,
  iterationFactory: PropertyIterationFactory,
) => {
  const invocation = PropertyFunction.invoke(f, Tree.outcome(tree) as Values);
  return invocation.kind === 'success'
    ? iterationFactory.unfalsified()
    : iterationFactory.falsified(tree, invocation.reason);
};

const exploreUnbounded = function* <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  initialSeed: Seed,
  initialSize: Size,
) {
  let currentSeed = initialSeed;

  for (let iterationNumber = 1; iterationNumber <= Number.MAX_SAFE_INTEGER; iterationNumber++) {
    const iterationSizeOffset = iterationNumber - 1;
    const untruncatedSize = initialSize + iterationSizeOffset;
    const currentSize = ((untruncatedSize - 1) % 100) + 1;

    const iterationFactory = PropertyExplorationIteration.factory(currentSeed, currentSize);

    const [leftSeed, rightSeed] = currentSeed.split();

    for (const treesOrFailStatus of runGensAsBatch<Values>(gens, rightSeed, currentSize)) {
      if (treesOrFailStatus === 'exhausted') {
        yield iterationFactory.exhausted();
      } else if (treesOrFailStatus === 'discarded') {
        yield iterationFactory.discarded();
      } else {
        yield checkIfFalsifiable(f, treesOrFailStatus, iterationFactory);
      }
    }

    currentSeed = leftSeed;
  }
};

export const explore = <Values extends AnyValues>(gens: Gens<Values>, f: PropertyFunction<Values>) => (
  seed: Seed,
  size: Size,
): Iterable<PropertyExplorationIteration<Values>> =>
  pipe(
    exploreUnbounded(gens, f, seed, size),
    takeWhileInclusive((iteration) => iteration.kind !== 'exhausted' && iteration.kind !== 'falsified'),
  );
