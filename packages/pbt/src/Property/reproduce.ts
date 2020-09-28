import { Gen, Seed, Size, Tree } from './Imports';
import { AnyValues } from './PropertyIteration';
import { PropertyFunction } from './PropertyFunction';
import { runGensAsBatch } from './runGensAsBatch';
import { first, last, pipe } from 'ix/iterable';
import { skip } from 'ix/iterable/operators';
import { PropertyResult } from './PropertyResult';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

export namespace ReproductionResult {
  export type ValidationError = {
    kind: 'validationError';
  };
}

export type ReproductionResult<Values extends AnyValues> =
  | ReproductionResult.ValidationError
  | PropertyResult.Falsified<Values>
  | PropertyResult.Unfalsified;

const traverseShrinkPath = <Values extends AnyValues>(
  tree: Tree<Values>,
  counterexamplePath: number[],
): Tree<Values> | null => {
  const shrinkPathComponent: number | undefined = counterexamplePath[0];
  if (shrinkPathComponent === undefined) return tree;

  const currentTree = first(pipe(Tree.shrinks(tree), skip(shrinkPathComponent)));
  if (currentTree === undefined) {
    return null;
  }

  return traverseShrinkPath(currentTree, counterexamplePath.slice(1));
};

export const reproduce = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  seed: Seed,
  size: Size,
  counterexamplePath: number[],
): ReproductionResult<Values> => {
  const [, rightSeed] = seed.split(); // Reproduce the initial split of the exploration.

  // TODO: pipe out all the discards from the gens
  const tree = last(runGensAsBatch<Values>(gens, rightSeed, size)) as Tree<Values>;

  const shrunkenTree = traverseShrinkPath(tree, counterexamplePath);
  if (shrunkenTree === null) {
    return {
      kind: 'validationError',
    };
  }

  const invocation = PropertyFunction.invoke(f, Tree.outcome(shrunkenTree));
  return invocation.kind === 'success'
    ? {
        kind: 'unfalsified',
        iterations: 1,
        discards: 0,
        seed,
        size,
      }
    : {
        kind: 'falsified',
        iterations: 1,
        discards: 0,
        seed,
        size,
        counterexample: Tree.outcome(shrunkenTree),
        counterexamplePath: counterexamplePath,
        reason: invocation.reason,
        shrinkIterations: 0,
      };
};
