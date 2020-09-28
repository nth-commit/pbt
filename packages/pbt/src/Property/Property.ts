import { empty, pipe } from 'ix/iterable';
import { map, scan } from 'ix/iterable/operators';
import { concatWithLast } from '../Gen';
import { explore as takeUntilFalsified } from './explore';
import { Gen, Seed, Size, Tree } from './Imports';
import { PropertyFunction } from './PropertyFunction';
import { AnyValues, PropertyExplorationIteration } from './PropertyIteration';
import { PropertyResult } from './PropertyResult';
import { ShrunkenExampleIteration, shrinkCounterexample } from './shrinkCounterexample';

export type Property<Values extends AnyValues> = (seed: Seed, size: Size) => Iterable<PropertyResult<Values>>;

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

namespace PropertyPreResult {
  export type PreFalsification<Values extends AnyValues> = Omit<
    PropertyResult.Falsified<Values>,
    'kind' | 'counterexample' | 'shrinkIteration'
  > & {
    kind: 'preFalsified';
    counterexampleTree: Tree<Values>;
  };
}

type PropertyPreResult<Values extends AnyValues> =
  | PropertyResult.Unfalsified
  | PropertyPreResult.PreFalsification<Values>
  | PropertyResult.Exhausted;

export const property = <Values extends AnyValues>(
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
    iteration: 0,
    discards: 0,
    seed,
    size,
  };

  return pipe(
    takeUntilFalsified(gens, f)(seed, size),
    scan<PropertyExplorationIteration<Values>, PropertyPreResult<Values>>({
      seed: result0,
      callback: consumePropertyExploration,
    }),
    concatWithLast((last) => {
      if (last.kind === 'preFalsified') {
        return pipe(
          shrinkCounterexample(f, last.counterexampleTree),
          scan<ShrunkenExampleIteration<Values>, PropertyResult.Falsified<Values>>({
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
  iteration: PropertyExplorationIteration<Values>,
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
        iteration: previousResult.iteration + 1,
        discards: previousResult.discards,
        seed: iteration.seed,
        size: iteration.size,
      };
    case 'falsified':
      return {
        kind: 'preFalsified',
        iteration: previousResult.iteration + 1,
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
  iteration: ShrunkenExampleIteration<Values>,
): PropertyResult.Falsified<Values> =>
  iteration.kind === 'counterexample'
    ? {
        ...previousResult,
        shrinkIteration: previousResult.shrinkIteration + 1,
        counterexamplePath: iteration.path,
        counterexample: iteration.values,
        reason: iteration.reason,
      }
    : {
        ...previousResult,
        shrinkIteration: previousResult.shrinkIteration + 1,
      };

const mapPreFalsificationToFalsification = <Values extends AnyValues>(
  preFalsification: PropertyPreResult.PreFalsification<Values>,
): PropertyResult.Falsified<Values> => ({
  kind: 'falsified',
  iteration: preFalsification.iteration,
  discards: preFalsification.discards,
  seed: preFalsification.seed,
  size: preFalsification.size,
  counterexample: Tree.outcome(preFalsification.counterexampleTree),
  counterexamplePath: preFalsification.counterexamplePath,
  reason: preFalsification.reason,
  shrinkIteration: 0,
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
