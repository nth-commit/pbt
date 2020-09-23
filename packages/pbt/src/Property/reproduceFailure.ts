import { Gen, Seed, Size, Tree } from './Imports';
import { AnyValues, Trees } from './PropertyIteration';
import { PropertyFunction } from './PropertyFunction';
import { runGensAsBatch } from './runGensAsBatch';
import { first, last, pipe } from 'ix/iterable';
import { skip } from 'ix/iterable/operators';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

export namespace ReproductionResult {
  export type ValidationError = {
    kind: 'validationError';
  };

  export type Reproducible<Values extends AnyValues> = {
    kind: 'reproducible';
    counterexample: Values;
  };

  export type Unreproducible = {
    kind: 'unreproducible';
  };
}

export type ReproductionResult<Values extends AnyValues> =
  | ReproductionResult.ValidationError
  | ReproductionResult.Reproducible<Values>
  | ReproductionResult.Unreproducible;

const traverseShrinkPath = <Values extends AnyValues>(
  tree: Tree<Values>,
  shrinkPath: number[],
): Tree<Values> | null => {
  const shrinkPathComponent: number | undefined = shrinkPath[0];
  if (shrinkPathComponent === undefined) return tree;

  const currentTree = first(pipe(Tree.shrinks(tree), skip(shrinkPathComponent)));
  if (currentTree === undefined) {
    return null;
  }

  return traverseShrinkPath(currentTree, shrinkPath.slice(1));
};

export const reproduceFailure = <Values extends AnyValues>(
  gens: Gens<Values>,
  f: PropertyFunction<Values>,
  seed: Seed,
  size: Size,
  shrinkPath: number[],
): ReproductionResult<Values> => {
  const [, rightSeed] = seed.split(); // Reproduce the initial split of the exploration.

  // TODO: pipe out all the discards from the gens
  const trees = last(runGensAsBatch<Values>(gens, rightSeed, size)) as Trees<Values>;
  const tree = Tree.combine(trees) as Tree<Values>;

  const shrunkenTree = traverseShrinkPath(tree, shrinkPath);
  if (shrunkenTree === null) {
    return {
      kind: 'validationError',
    };
  }

  const invocation = PropertyFunction.invoke(f, Tree.outcome(shrunkenTree));
  return invocation.kind === 'success'
    ? {
        kind: 'unreproducible',
      }
    : {
        kind: 'reproducible',
        counterexample: Tree.outcome(shrunkenTree),
      };
};
