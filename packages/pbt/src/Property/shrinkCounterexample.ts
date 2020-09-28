import { pipe } from 'ix/iterable';
import { map, skip, tap } from 'ix/iterable/operators';
import { indexed } from '../Gen';
import { Tree } from './Imports';
import { PropertyFunction, PropertyFunctionFailureReason } from './PropertyFunction';
import { AnyValues } from './PropertyIteration';

export type ShrunkenExampleIteration<Values extends AnyValues> =
  | {
      kind: 'counterexample';
      values: Values;
      path: number[];
      reason: PropertyFunctionFailureReason;
    }
  | {
      kind: 'nonCounterexample';
      values: Values;
      path: number[];
    };

const exploreTree = function* <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexampleTree: Tree<Values>,
): Iterable<ShrunkenExampleIteration<Values>> {
  const values = Tree.outcome(counterexampleTree);
  const invocation = PropertyFunction.invoke(f, values);
  if (invocation.kind === 'success') {
    yield {
      kind: 'nonCounterexample',
      path: [],
      values,
    };
    return;
  }

  const confirmedCounterexample: ShrunkenExampleIteration<Values> = {
    kind: 'counterexample',
    reason: invocation.reason,
    path: [],
    values,
  };
  yield confirmedCounterexample;

  yield* exploreForest(f, Tree.shrinks(counterexampleTree));
};

const exploreForest = function* <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexampleForest: Iterable<Tree<Values>>,
): Iterable<ShrunkenExampleIteration<Values>> {
  for (const { value: counterexampleTree, index } of pipe(counterexampleForest, indexed())) {
    let hasConfirmedCounterexample = false;

    yield* pipe(
      exploreTree(f, counterexampleTree),
      map((x) => ({
        ...x,
        path: [index, ...x.path],
      })),
      tap((x) => {
        if (x.kind === 'counterexample') {
          hasConfirmedCounterexample = true;
        }
      }),
    );

    // If there is a confirmed counterexample on this branch, then we should not be trying the branch of the next
    // sibling. It is expected that shrinks are non-decreasing from left-to-right. So trying the right sibling of a
    // confirmed shrink should not produce a smaller counterexample.
    if (hasConfirmedCounterexample) {
      break;
    }
  }
};

export const shrinkCounterexample = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexample: Tree<Values>,
): Iterable<ShrunkenExampleIteration<Values>> => {
  return exploreForest(f, Tree.shrinks(counterexample));
};
