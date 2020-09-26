import { pipe } from 'ix/iterable';
import { map, tap } from 'ix/iterable/operators';
import { Tree } from './Imports';
import { PropertyFunction, PropertyFunctionFailureReason } from './PropertyFunction';
import { AnyValues } from './PropertyIteration';

export type CounterexampleIteration<Values extends AnyValues> =
  | {
      kind: 'confirmed';
      values: Values;
      path: number[];
      reason: PropertyFunctionFailureReason;
    }
  | {
      kind: 'rejected';
      values: Values;
      path: number[];
    };

const findDeepestLeftmostCounterexample = function* <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexampleCandidate: Tree<Values>,
): Iterable<CounterexampleIteration<Values>> {
  const values = Tree.outcome(counterexampleCandidate);
  const invocation = PropertyFunction.invoke(f, values);
  if (invocation.kind === 'success') {
    yield {
      kind: 'rejected',
      path: [],
      values,
    };
    return;
  }

  const confirmedCounterexample: CounterexampleIteration<Values> = {
    kind: 'confirmed',
    reason: invocation.reason,
    path: [],
    values,
  };
  yield confirmedCounterexample;

  const childCounterexampleCandidates = Tree.shrinks(counterexampleCandidate);
  let i = 0;
  for (const childCounterexampleCandidate of childCounterexampleCandidates) {
    let hasConfirmedCounterexample = false;

    yield* pipe(
      findDeepestLeftmostCounterexample(f, childCounterexampleCandidate),
      map((x) => ({
        ...x,
        path: [i, ...x.path],
      })),
      tap((x) => {
        if (x.kind === 'confirmed') {
          hasConfirmedCounterexample = true;
        }
      }),
    );

    if (hasConfirmedCounterexample) {
      break;
    }

    i++;
  }
};

export const shrinkCounterexample = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexample: Tree<Values>,
): Iterable<CounterexampleIteration<Values>> => {
  return findDeepestLeftmostCounterexample(f, counterexample);
};
