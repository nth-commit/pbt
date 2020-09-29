import { empty, pipe } from 'ix/iterable';
import { map, scan } from 'ix/iterable/operators';
import { concatWithLast } from '../Gen';
import { Seed, Size, Tree } from './Imports';
import { Gens, Property, PropertyResult, PropertyFunction, AnyValues } from './Property';
import { exploreGrowing, GrowingExplorationIteration } from './Exploration.Growing';
import { ShrinkingExplorationIteration, exploreShrinking } from './Exploration.Shrinking';

namespace PropertyPreResult {
  export type PreFalsification<Values extends AnyValues> = Omit<
    PropertyResult.Falsified<Values>,
    'kind' | 'counterexample' | 'shrinkIterations'
  > & {
    kind: 'preFalsified';
    counterexampleTree: Tree<Values>;
  };
}

type PropertyPreResult<Values extends AnyValues> =
  | PropertyResult.Unfalsified
  | PropertyPreResult.PreFalsification<Values>
  | PropertyResult.Exhausted
  | PropertyResult.Error;

export const explore = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
): Property<Values> => (seed, size) => generateResults(gens, f, seed, size);

const generateResults = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  seed: Seed,
  size: Size,
): Iterable<PropertyResult<Values>> => {
  const result0: PropertyPreResult<Values> = {
    kind: 'unfalsified',
    iterations: 0,
    discards: 0,
    seed,
    size,
  };

  return pipe(
    exploreGrowing(gens, f)(seed, size),
    scan<GrowingExplorationIteration<Values>, PropertyPreResult<Values>>({
      seed: result0,
      callback: consumePropertyExploration,
    }),
    concatWithLast((last) => {
      if (last.kind === 'preFalsified') {
        return pipe(
          exploreShrinking(f, last.counterexampleTree),
          scan<ShrinkingExplorationIteration<Values>, PropertyResult.Falsified<Values>>({
            seed: mapPreFalsificationToFalsification(last),
            callback: consumeShrunkenExample,
          }),
        );
      }

      return empty();
    }),
    map(
      (preResultOrResult): PropertyResult<Values> =>
        preResultOrResult.kind === 'falsified' ? preResultOrResult : mapPreResultToResult(preResultOrResult),
    ),
  );
};

const consumePropertyExploration = <Values extends AnyValues>(
  previousResult: PropertyPreResult<Values>,
  iteration: GrowingExplorationIteration<Values>,
): PropertyPreResult<Values> => {
  switch (iteration.kind) {
    case 'discarded':
      return {
        ...previousResult,
        discards: previousResult.discards + 1,
      };
    case 'exhausted':
    case 'unfalsified':
      return {
        kind: iteration.kind,
        iterations: previousResult.iterations + 1,
        discards: previousResult.discards,
        seed: iteration.seed,
        size: iteration.size,
      };
    case 'falsified':
      return {
        kind: 'preFalsified',
        iterations: previousResult.iterations + 1,
        discards: previousResult.discards,
        seed: iteration.seed,
        size: iteration.size,
        counterexampleTree: iteration.counterexample,
        counterexamplePath: [],
        reason: iteration.reason,
      };
  }
};

const consumeShrunkenExample = <Values extends AnyValues>(
  previousResult: PropertyResult.Falsified<Values>,
  iteration: ShrinkingExplorationIteration<Values>,
): PropertyResult.Falsified<Values> =>
  iteration.kind === 'counterexample'
    ? {
        ...previousResult,
        shrinkIterations: previousResult.shrinkIterations + 1,
        counterexamplePath: iteration.path,
        counterexample: iteration.values,
        reason: iteration.reason,
      }
    : {
        ...previousResult,
        shrinkIterations: previousResult.shrinkIterations + 1,
      };

const mapPreFalsificationToFalsification = <Values extends AnyValues>(
  preFalsification: PropertyPreResult.PreFalsification<Values>,
): PropertyResult.Falsified<Values> => ({
  kind: 'falsified',
  iterations: preFalsification.iterations,
  discards: preFalsification.discards,
  seed: preFalsification.seed,
  size: preFalsification.size,
  counterexample: Tree.outcome(preFalsification.counterexampleTree),
  counterexamplePath: preFalsification.counterexamplePath,
  reason: preFalsification.reason,
  shrinkIterations: 0,
});

const mapPreResultToResult = <Values extends AnyValues>(
  preResult: PropertyPreResult<Values>,
): PropertyResult<Values> => {
  switch (preResult.kind) {
    case 'preFalsified':
      return mapPreFalsificationToFalsification(preResult);
    default:
      return preResult;
  }
};
