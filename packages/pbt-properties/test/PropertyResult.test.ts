import * as dev from '../src';
import * as devGen from 'pbt-gen';
import * as stable from './helpers/stableApi';
import {
  arbitrarySucceedingPropertyFunction,
  arbitraryPropertyConfig,
  arbitraryGens,
  arbitrarilyShuffleIn,
} from './helpers/arbitraries';

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

      expect(result).toMatchObject({ kind: 'failure', reason: 'predicate' });
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
