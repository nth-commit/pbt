import fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import * as spies from './helpers/spies';
import { failwith } from './helpers/failwith';
import { arbitrarySeed, arbitrarySize } from './helpers/arbitraries';

const arbitraryFailureReason = (): fc.Arbitrary<dev.PropertyResult.Failure<[]>['reason']> => {
  type FailureReasons = { [P in dev.PropertyResult.Failure<[]>['reason']]: P };
  const failureReasons: FailureReasons = { predicate: 'predicate' };
  return fc.constantFrom(...Object.values(failureReasons));
};

const arbitraryCounterexample = (arity: number): fc.Arbitrary<dev.PropertyCounterexample<unknown[]>> =>
  fc
    .tuple(fc.array(fc.anything(), arity, arity), fc.array(fc.anything(), arity, arity), fc.array(fc.integer(0, 10)))
    .map(([values, originalValues, shrinkPath]) => ({
      values,
      originalValues,
      shrinkPath,
    }));

const arbitraryFailurePropertyResult = (): fc.Arbitrary<dev.PropertyResult.Failure<unknown[]>> =>
  fc
    .tuple(
      arbitraryFailureReason(),
      arbitrarySeed(),
      arbitrarySize(),
      fc.integer(0, 10).chain((arity) => arbitraryCounterexample(arity)),
    )
    .map(([reason, seed, size, counterexample]) => ({
      kind: 'failure',
      reason,
      seed,
      size,
      counterexample,
    }));

const mockProperty = {
  success: (): dev.Property<unknown[]> => () => ({ kind: 'success' }),
  failure: (result: dev.PropertyResult.Failure<unknown[]>): dev.Property<unknown[]> => () => result,
};

test('Input defaults are passed through', () => {
  stable.assert(
    stable.property(fc.anything(), () => {
      const p = spies.spyOn(mockProperty.success());

      dev.run(p);

      const expectedPropertyConfig: dev.PropertyConfig = {
        iterations: 100,
        seed: expect.anything(),
        size: 0,
        shrinkPath: undefined,
      };
      const calls = spies.calls(p);
      expect(calls).toHaveLength(1);
      expect(calls[0][0]).toEqual(expectedPropertyConfig);
    }),
  );
});

test('Input seed is marshalled correctly', () => {
  stable.assert(
    stable.property(fc.nat(), (seed) => {
      const p = spies.spyOn(mockProperty.success());

      dev.run(p, { seed });

      const calls = spies.calls(p);
      expect(calls).toHaveLength(1);
      expect(calls[0][0].seed.valueOf()).toEqual(seed);
    }),
  );
});

test('Input size is passed through', () => {
  stable.assert(
    stable.property(fc.integer(), (size) => {
      const p = spies.spyOn(mockProperty.success());

      dev.run(p, { size });

      const calls = spies.calls(p);
      expect(calls).toHaveLength(1);
      expect(calls[0][0].size).toEqual(size);
    }),
  );
});

test('Input iterations is passed through', () => {
  stable.assert(
    stable.property(fc.integer(), (iterations) => {
      const p = spies.spyOn(mockProperty.success());

      dev.run(p, { iterations });

      const calls = spies.calls(p);
      expect(calls).toHaveLength(1);
      expect(calls[0][0].iterations).toEqual(iterations);
    }),
  );
});

test('Input shrinkPath is marshalled correctly', () => {
  const shrinkPathExamples: [string, number[]][] = [
    ['0', [0]],
    ['1', [1]],
    ['0:1', [0, 1]],
    ['0:1:0:1:0:1', [0, 1, 0, 1, 0, 1]],
    ['10:15:2:8:0:6', [10, 15, 2, 8, 0, 6]],
    ['adasdd:0:1', [NaN, 0, 1]],
  ];

  stable.assert(
    stable.property(fc.constantFrom(...shrinkPathExamples), ([shrinkPath, expectedShrinkPath]) => {
      const p = spies.spyOn(mockProperty.success());

      dev.run(p, { shrinkPath });

      const calls = spies.calls(p);
      expect(calls).toHaveLength(1);
      expect(calls[0][0].shrinkPath).toEqual(expectedShrinkPath);
    }),
  );
});

test('The output seed is marshalled correctly', () => {
  stable.assert(
    stable.property(arbitraryFailurePropertyResult(), (propertyResult) => {
      const p = mockProperty.failure(propertyResult);

      const runResult = dev.run(p);
      if (runResult.kind !== 'failure') return failwith('expected failure');

      expect(runResult.seed).toEqual(propertyResult.seed.valueOf());
    }),
  );
});

test('The output size is passed through', () => {
  stable.assert(
    stable.property(arbitraryFailurePropertyResult(), (propertyResult) => {
      const p = mockProperty.failure(propertyResult);

      const runResult = dev.run(p);
      if (runResult.kind !== 'failure') return failwith('expected failure');

      expect(runResult.size).toEqual(propertyResult.size);
    }),
  );
});

test('The output shrinkPath is marshalled correctly', () => {
  const shrinkPathExamples: [number[], string][] = [
    [[0], '0'],
    [[1], '1'],
    [[0, 1], '0:1'],
    [[0, 1, 0, 1, 0, 1], '0:1:0:1:0:1'],
    [[10, 15, 2, 8, 0, 6], '10:15:2:8:0:6'],
  ];

  stable.assert(
    stable.property(
      arbitraryFailurePropertyResult(),
      fc.constantFrom(...shrinkPathExamples),
      (propertyResult, [shrinkPath, expectedShrinkPath]) => {
        const p = mockProperty.failure({
          ...propertyResult,
          counterexample: {
            ...propertyResult.counterexample,
            shrinkPath,
          },
        });

        const runResult = dev.run(p);
        if (runResult.kind !== 'failure') return failwith('expected failure');

        expect(runResult.counterexample.shrinkPath).toEqual(expectedShrinkPath);
      },
    ),
  );
});
