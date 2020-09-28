import { pipe, toArray } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as dev from '../../../src/Property';

export type TreeComparison<T> = T[];

export const treeComparer = <T>(tree: dev.Tree<T>): TreeComparison<T> =>
  toArray(pipe(dev.Tree.traverse(tree), take(10)));

export type PropertyIterationComparison<T> =
  | {
      kind: 'unfalsified' | 'discarded' | 'exhausted';
      seed: number;
      size: number;
    }
  | {
      kind: 'falsified';
      counterexample: TreeComparison<T>;
      reason: dev.PropertyFunctionFailureReason;
      seed: number;
      size: number;
    };

export const propertyIteration = <Values extends dev.AnyValues>(
  iteration: dev.PropertyExplorationIteration<Values>,
): PropertyIterationComparison<Values> => {
  const seedAndSize = {
    seed: iteration.seed.valueOf(),
    size: iteration.size,
  };

  switch (iteration.kind) {
    case 'unfalsified':
    case 'discarded':
    case 'exhausted':
      return {
        kind: iteration.kind,
        ...seedAndSize,
      };
    case 'falsified':
      return {
        kind: 'falsified',
        ...seedAndSize,
        counterexample: treeComparer(iteration.counterexample),
        reason: iteration.reason,
      };
  }
};
