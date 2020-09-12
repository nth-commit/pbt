import fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import * as spies from './helpers/spies';
import { failwith } from './helpers/failwith';

const arbitraryMockFailurePropertyResult = (): fc.Arbitrary<dev.PropertyResult.Failure<[]>> =>
  fc.constant<dev.PropertyResult.Failure<[]>>({
    kind: 'failure',
    reason: 'predicate',
    seed: dev.Seed.spawn(),
    size: 0,
    counterexample: {
      originalValues: [],
      values: [],
      shrinkPath: [],
    },
  });

const mockProperty = {
  success: (): dev.Property<[]> => () => ({ kind: 'success' }),
  failure: (result: dev.PropertyResult.Failure<[]>): dev.Property<[]> => () => result,
};

test('The input seed is marshalled correctly', () => {
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

test('The output seed is marshalled correctly', () => {
  stable.assert(
    stable.property(arbitraryMockFailurePropertyResult(), (propertyResult) => {
      const p = mockProperty.failure(propertyResult);

      const runResult = dev.run(p);
      if (runResult.kind !== 'failure') return failwith('expected failure');

      expect(runResult.seed).toEqual(propertyResult.seed.valueOf());
    }),
  );
});
