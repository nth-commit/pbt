import fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryFailurePropertyResult } from './helpers/arbitraries';
import * as spies from './helpers/spies';
import * as mocks from './helpers/mocks';
import { failwith } from './helpers/failwith';

test('Input defaults are passed through', () => {
  stable.assert(
    stable.property(fc.anything(), () => {
      const p = spies.spyOn(mocks.properties.success());

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
      const p = spies.spyOn(mocks.properties.success());

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
      const p = spies.spyOn(mocks.properties.success());

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
      const p = spies.spyOn(mocks.properties.success());

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
      const p = spies.spyOn(mocks.properties.success());

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
      const p = mocks.properties.failure(propertyResult);

      const runResult = dev.run(p);
      if (runResult.kind !== 'failure') return failwith('expected failure');

      expect(runResult.seed).toEqual(propertyResult.seed.valueOf());
    }),
  );
});

test('The output size is passed through', () => {
  stable.assert(
    stable.property(arbitraryFailurePropertyResult(), (propertyResult) => {
      const p = mocks.properties.failure(propertyResult);

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
        const p = mocks.properties.failure({
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
