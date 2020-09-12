import * as dev from '../src';
import * as devGen from 'pbt-gen';
import * as stable from './helpers/stableApi';
import {
  arbitrarySucceedingPropertyFunction,
  arbitraryPropertyConfig,
  arbitraryGens,
  arbitrarilyShuffleIn,
} from './helpers/arbitraries';
import { arbitraryInteger } from 'pbt-gen/test/helpers/arbitraries';
import fc from 'fast-check';

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

      expect(result).toMatchObject({
        kind: 'failure',
        reason: 'predicate',
        iterationsCompleted: 1,
      });
    }),
  );
});

test('Given an eventually false predicate, the property returns the expected iterations metrics', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens(), fc.integer(0, 100)] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, fSuccessCount) => {
      let fCount = 0;
      const f = (_: unknown) => {
        fCount++;
        return fCount <= fSuccessCount;
      };
      const p = dev.property(...gs, f);

      const iterations = Math.max(config.iterations, fSuccessCount + 1);
      const result = p({ ...config, iterations });

      expect(result).toMatchObject({
        kind: 'failure',
        reason: 'predicate',
        iterationsRequested: iterations,
        iterationsCompleted: fSuccessCount + 1,
      });
    }),
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
