import { pipe } from 'ix/iterable';
import { Gen, Seed, Size, Tree } from './Imports';
import { PropertyFunction } from './PropertyFunction';
import { PropertyIteration, PropertyIterationFactory, AnyValues } from './PropertyIteration';
import { Property } from './Property';
import { takeWhileInclusive } from '../Gen';
import { runGensAsBatch } from './runGensAsBatch';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

const checkIfFalsifiable = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  tree: Tree<Values>,
  propertyIterationFactory: PropertyIterationFactory,
) => {
  const invocation = PropertyFunction.invoke(f, Tree.outcome(tree) as Values);
  return invocation.kind === 'success'
    ? propertyIterationFactory.success()
    : propertyIterationFactory.falsification(tree, invocation.reason);
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

    const propertyIterationFactory = PropertyIteration.factory(currentSeed, currentSize);

    const [leftSeed, rightSeed] = currentSeed.split();

    for (const treesOrFailStatus of runGensAsBatch<Values>(gens, rightSeed, currentSize)) {
      if (treesOrFailStatus === 'exhaustion') {
        yield propertyIterationFactory.exhaustion();
      } else if (treesOrFailStatus === 'discard') {
        yield propertyIterationFactory.discard();
      } else {
        yield checkIfFalsifiable(f, treesOrFailStatus, propertyIterationFactory);
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
