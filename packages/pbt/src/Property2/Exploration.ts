import { pipe } from 'ix/iterable';
import { scan } from 'ix/iterable/operators';
import { Seed, Size } from './Imports';
import { Gens, Property, PropertyResult, PropertyFunction, AnyValues } from './Property';
import { exploreGrowing, GrowingExplorationIteration } from './Exploration.Growing';
import { exploreShrinking } from './Exploration.Shrinking';

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
  const result0: PropertyResult<Values> = {
    kind: 'unfalsified',
    iterations: 0,
    discards: 0,
    seed,
    size,
  };

  return pipe(
    exploreGrowing(gens, f)(seed, size),
    scan<GrowingExplorationIteration<Values>, PropertyResult<Values>>({
      seed: result0,
      callback: consumePropertyExploration(f),
    }),
  );
};

const consumePropertyExploration = <Values extends AnyValues>(f: PropertyFunction<Values>) => (
  previousResult: PropertyResult<Values>,
  iteration: GrowingExplorationIteration<Values>,
): PropertyResult<Values> => {
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
        kind: 'falsified',
        iterations: previousResult.iterations + 1,
        discards: previousResult.discards,
        seed: iteration.seed,
        size: iteration.size,
        counterexample: {
          path: [],
          complexity: iteration.counterexample.node.complexity,
          value: iteration.counterexample.node.value,
          reason: iteration.reason,
        },
        shrinks: exploreShrinking(f, iteration.counterexample),
      };
  }
};
