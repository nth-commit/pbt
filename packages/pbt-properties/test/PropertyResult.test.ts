import * as dev from '../src';
import * as devGen from 'pbt-gen';
import * as stable from './helpers/stableApi';
import {
  arbitrarySucceedingPropertyFunction,
  arbitraryPropertyConfig,
  arbitraryGens,
  arbitrarilyShuffleIn,
} from './helpers/arbitraries';
import fc from 'fast-check';
import { withInvocationCount } from './helpers/functionHelpers';

test('Given a succeeding property function, the property holds', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens(), arbitrarySucceedingPropertyFunction()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f) => {
      const p = dev.property(...gs, f);

      const result = p(config);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs) => {
      const f = (_: unknown) => false;
      const p = dev.property(...gs, f);

      const result = p(config);

      const expectedResult: Partial<dev.PropertyResult<any[]>> = {
        kind: 'failure',
        reason: {
          kind: 'predicate',
        },
        iterationsCompleted: 1,
      };
      expect(result).toMatchObject(expectedResult);
    }),
  );
});

test('Given a throwing function, the property does not hold', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens(), fc.anything()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, error) => {
      const f = (_: unknown) => {
        throw error;
      };
      const p = dev.property(...gs, f);

      const result = p(config);

      const expectedResult: Partial<dev.PropertyResult<any[]>> = {
        kind: 'failure',
        reason: {
          kind: 'throws',
          error,
        },
        iterationsCompleted: 1,
      };
      expect(result).toMatchObject(expectedResult);
    }),
  );
});

test('Given an eventually false predicate, the property returns the expected iterations metrics', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens(), fc.integer(0, 100)] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, falseAfterN) => {
      const f = withInvocationCount((i, _: unknown) => i <= falseAfterN);
      const p = dev.property(...gs, f);

      const iterations = Math.max(config.iterations, falseAfterN + 1);
      const result = p({ ...config, iterations });

      const expectedResult: Partial<dev.PropertyResult<any[]>> = {
        kind: 'failure',
        reason: {
          kind: 'predicate',
        },
        iterationsRequested: iterations,
        iterationsCompleted: falseAfterN + 1,
      };
      expect(result).toMatchObject(expectedResult);
    }),
  );
});

test('Given an eventually throwing function, the property returns the expected iterations metrics', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens(), fc.integer(0, 100), fc.anything()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, throwAfterN, error) => {
      const f = withInvocationCount((i, _: unknown) => {
        if (i <= throwAfterN) return;
        throw error;
      });
      const p = dev.property(...gs, f);

      const iterations = Math.max(config.iterations, throwAfterN + 1);
      const result = p({ ...config, iterations });

      const expectedResult: Partial<dev.PropertyResult<any[]>> = {
        kind: 'failure',
        reason: {
          kind: 'throws',
          error,
        },
        iterationsRequested: iterations,
        iterationsCompleted: throwAfterN + 1,
      };
      expect(result).toMatchObject(expectedResult);
    }),
    { seed: 800196574, path: '0:0:0:0:1:0:0', endOnFailure: true },
  );
});

test('Given an exhausting generator, the property does not hold', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens().chain((gs) => arbitrarilyShuffleIn(gs, devGen.exhausted())),
    arbitrarySucceedingPropertyFunction(),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f) => {
      const p = dev.property(...gs, f);

      const result = p(config);

      expect(result).toEqual({
        kind: 'exhaustion',
        iterationsRequested: config.iterations,
        iterationsCompleted: 0,
      });
    }),
  );
});
