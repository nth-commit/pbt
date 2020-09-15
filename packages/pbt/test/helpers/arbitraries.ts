import fc from 'fast-check';
import * as dev from '../../src';
import * as devProperties from 'pbt-properties';

export const arbitrarySeed = (): fc.Arbitrary<dev.Seed> => fc.nat().map(dev.Seed.create).noShrink();

export const arbitrarySize = (): fc.Arbitrary<dev.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

const arbitraryFailureReason = (): fc.Arbitrary<devProperties.PropertyResult.FailureReason> => {
  type FailureReasons = {
    [P in devProperties.PropertyResult.FailureReason['kind']]: fc.Arbitrary<devProperties.PropertyResult.FailureReason>;
  };

  const arbitraryFailureReasonByKind: FailureReasons = {
    predicate: fc.constant({ kind: 'predicate' }),
    throws: fc.string().map((message) => ({ kind: 'throws', error: new Error(message) })),
  };

  return fc.oneof(...Object.values(arbitraryFailureReasonByKind));
};

const arbitraryCounterexample = (arity: number): fc.Arbitrary<devProperties.PropertyResult.Counterexample<unknown[]>> =>
  fc
    .tuple(fc.array(fc.anything(), arity, arity), fc.array(fc.anything(), arity, arity), fc.array(fc.integer(0, 10)))
    .map(([values, originalValues, shrinkPath]) => ({
      values,
      originalValues,
      shrinkPath,
    }));

export const arbitraryFailurePropertyResult = (
  failureReasonArb: fc.Arbitrary<devProperties.PropertyResult.FailureReason> = arbitraryFailureReason(),
): fc.Arbitrary<devProperties.PropertyResult.Failure<unknown[]>> =>
  fc
    .tuple(
      failureReasonArb,
      arbitrarySeed(),
      arbitrarySize(),
      fc.integer(1, 100),
      fc.integer(1, 100),
      fc.integer(0, 10).chain((arity) => arbitraryCounterexample(arity)),
    )
    .map(([reason, seed, size, iterationsRequested, iterationsCompleted, counterexample]) => ({
      kind: 'failure',
      reason,
      seed,
      size,
      iterationsRequested,
      iterationsCompleted,
      counterexample,
    }));

export const arbitraryPredicateFailurePropertyResult = (): fc.Arbitrary<
  devProperties.PropertyResult.Failure<unknown[]>
> => arbitraryFailurePropertyResult(fc.constant({ kind: 'predicate' }));

export const arbitraryThrowFailurePropertyResult = (
  failureReasonArb: fc.Arbitrary<unknown>,
): fc.Arbitrary<devProperties.PropertyResult.Failure<unknown[]>> =>
  arbitraryFailurePropertyResult(failureReasonArb.map((error) => ({ kind: 'throws', error })));
