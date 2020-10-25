import { pipe } from 'ix/iterable';
import { map, tap } from 'ix/iterable/operators';
import { indexed } from '../Gen';
import { GenTree } from './Imports';
import { AnyValues, PropertyFunction, ShrinkResult } from './Property';

const exploreTree = function* <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexampleTree: GenTree<Values>,
): Iterable<ShrinkResult<Values>> {
  const invocation = PropertyFunction.invoke(f, counterexampleTree.node.value);
  if (invocation.kind === 'success') {
    yield {
      kind: 'nonCounterexample',
      path: [],
      ...counterexampleTree.node,
    };
    return;
  }

  const confirmedCounterexample: ShrinkResult<Values> = {
    kind: 'counterexample',
    reason: invocation.reason,
    path: [],
    ...counterexampleTree.node,
  };
  yield confirmedCounterexample;

  yield* exploreForest(f, counterexampleTree.shrinks);
};

const exploreForest = function* <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexampleForest: Iterable<GenTree<Values>>,
): Iterable<ShrinkResult<Values>> {
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

export const exploreShrinking = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexample: GenTree<Values>,
): Iterable<ShrinkResult<Values>> => exploreForest(f, counterexample.shrinks);
