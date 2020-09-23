import { Tree } from './Imports';
import { PropertyFunction, PropertyFunctionFailureReason } from './PropertyFunction';
import { AnyValues } from './PropertyIteration';

type Trees<Values extends AnyValues> = { [P in keyof Values]: Tree<Values[P]> };

type Counterexample<Values extends AnyValues> =
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
): Iterable<Counterexample<Values>> {
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

  const confirmedCounterexample: Counterexample<Values> = {
    kind: 'confirmed',
    reason: invocation.reason,
    path: [],
    values,
  };
  yield confirmedCounterexample;

  const childCounterexampleCandidates = Tree.shrinks(counterexampleCandidate);
  let i = 0;
  for (const childCounterexampleCandidate of childCounterexampleCandidates) {
    for (const childCounterexample of findDeepestLeftmostCounterexample(f, childCounterexampleCandidate)) {
      yield {
        ...childCounterexample,
        path: [i, ...childCounterexample.path],
      };

      if (childCounterexample.kind === 'rejected') {
        return;
      }
    }
    i++;
  }
};

export const shrinkCounterexample = <Values extends AnyValues>(
  f: PropertyFunction<Values>,
  counterexample: Trees<Values>,
): Iterable<Counterexample<Values>> => {
  const counterexampleCandidate = Tree.combine(counterexample) as Tree<Values>;

  return findDeepestLeftmostCounterexample(f, counterexampleCandidate);
};
