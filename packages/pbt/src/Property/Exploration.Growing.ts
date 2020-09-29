import { pipe } from 'ix/iterable';
import { Seed, Size, Tree } from './Imports';
import { takeWhileInclusive } from '../Gen';
import { runGensAsBatch } from './runGensAsBatch';
import { PropertyFunction, AnyValues, PropertyFailureReason, Gens } from './Property';

export type GrowingExplorationIterationFactory = {
  unfalsified: () => GrowingExplorationIteration.Unfalsified;
  falsified: <Values extends AnyValues>(
    counterexample: Tree<Values>,
    reason: PropertyFailureReason,
  ) => GrowingExplorationIteration.Falsified<Values>;
  discarded: () => GrowingExplorationIteration.Discarded;
  exhausted: () => GrowingExplorationIteration.Exhausted;
};

export namespace GrowingExplorationIteration {
  type BasePropertyIterationResult<Kind extends string, Props> = {
    kind: Kind;
    seed: Seed;
    size: Size;
  } & Props;

  export type Unfalsified = BasePropertyIterationResult<'unfalsified', {}>;

  export type Falsified<Values extends AnyValues> = BasePropertyIterationResult<
    'falsified',
    {
      counterexample: Tree<Values>;
      reason: PropertyFailureReason;
    }
  >;

  export type Discarded = BasePropertyIterationResult<'discarded', {}>;

  export type Exhausted = BasePropertyIterationResult<'exhausted', {}>;

  export const factory = (seed: Seed, size: Size): GrowingExplorationIterationFactory => ({
    unfalsified: (): Unfalsified => ({ kind: 'unfalsified', seed, size }),

    falsified: <Values extends AnyValues>(
      counterexample: Tree<Values>,
      reason: PropertyFailureReason,
    ): Falsified<Values> => ({
      kind: 'falsified',
      seed,
      size,
      counterexample,
      reason,
    }),

    discarded: (): Discarded => ({ kind: 'discarded', seed, size }),

    exhausted: (): Exhausted => ({ kind: 'exhausted', seed, size }),
  });
}

export type GrowingExplorationIteration<Values extends AnyValues> =
  | GrowingExplorationIteration.Unfalsified
  | GrowingExplorationIteration.Falsified<Values>
  | GrowingExplorationIteration.Discarded
  | GrowingExplorationIteration.Exhausted;

const checkIfFalsifiable = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  tree: Tree<Values>,
  iterationFactory: GrowingExplorationIterationFactory,
) => {
  const invocation = PropertyFunction.invoke(f, Tree.outcome(tree) as Values);
  return invocation.kind === 'success'
    ? iterationFactory.unfalsified()
    : iterationFactory.falsified(tree, invocation.reason);
};

const exploreGrowingUnbounded = function* <Values extends AnyValues>(
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

    const iterationFactory = GrowingExplorationIteration.factory(currentSeed, currentSize);

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

export const exploreGrowing = <Values extends AnyValues>(gens: Gens<Values>, f: PropertyFunction<Values>) => (
  seed: Seed,
  size: Size,
): Iterable<GrowingExplorationIteration<Values>> =>
  pipe(
    exploreGrowingUnbounded(gens, f, seed, size),
    takeWhileInclusive((iteration) => iteration.kind !== 'exhausted' && iteration.kind !== 'falsified'),
  );
