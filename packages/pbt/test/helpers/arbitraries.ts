import fc from 'fast-check';
import * as dev from '../../src';
import * as devProperties from 'pbt-properties';

export const arbitrarySeed = (): fc.Arbitrary<dev.Seed> => fc.nat().map(dev.Seed.create).noShrink();

export const arbitrarySize = (): fc.Arbitrary<dev.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

const arbitraryFailureReason = (): fc.Arbitrary<devProperties.PropertyResult.Failure<[]>['reason']> => {
  type FailureReasons = { [P in devProperties.PropertyResult.Failure<[]>['reason']]: P };
  const failureReasons: FailureReasons = { predicate: 'predicate' };
  return fc.constantFrom(...Object.values(failureReasons));
};

const arbitraryCounterexample = (arity: number): fc.Arbitrary<devProperties.PropertyCounterexample<unknown[]>> =>
  fc
    .tuple(fc.array(fc.anything(), arity, arity), fc.array(fc.anything(), arity, arity), fc.array(fc.integer(0, 10)))
    .map(([values, originalValues, shrinkPath]) => ({
      values,
      originalValues,
      shrinkPath,
    }));

export const arbitraryFailurePropertyResult = (): fc.Arbitrary<devProperties.PropertyResult.Failure<unknown[]>> =>
  fc
    .tuple(
      arbitraryFailureReason(),
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
