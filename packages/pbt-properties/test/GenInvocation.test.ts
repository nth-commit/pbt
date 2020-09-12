import fc from 'fast-check';
import * as devGen from 'pbt-gen';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  arbitraryGen,
  arbitraryGens,
  arbitraryPropertyConfig,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { spyOn, spyOnAll, calls, GenSpy } from './helpers/spies';

test('A generator receives the initial size', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGen(), arbitraryPropertyFunction()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, g, f) => {
      const spy = spyOn(g);
      const p = dev.property(spy, f);

      p({ ...config, iterations: 1 });

      expect(spy).toBeCalledTimes(1);
      expect(spy).toBeCalledWith(expect.anything(), config.size);
    }),
  );
});

test('A generator always receives a size, where 0 <= size <= 100', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens().filter((gs) => gs.length > 0),
    arbitraryPropertyFunction(),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f) => {
      const spies = spyOnAll(gs);
      const p = dev.property(...spies, f);

      p(config);

      const allSizes = ([] as number[]).concat(...spies.map(GenSpy.observedSizes));
      expect(allSizes).not.toHaveLength(0);
      allSizes.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      });
    }),
  );
});

test('Each generator is invoked for each iteration of a succeeding property', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens().filter((gs) => gs.length > 0),
    arbitrarySucceedingPropertyFunction(),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f) => {
      const spies = spyOnAll(gs);
      const p = dev.property(...spies, f);

      p(config);

      const callsByGenerator = spies.map(calls);
      expect(callsByGenerator).not.toHaveLength(0);
      callsByGenerator.forEach((calls) => {
        expect(calls).toHaveLength(config.iterations);
      });
    }),
  );
});

test('If initial size = 0, then each generator is ultimately invoked with a size, where size = (iterations - 1) % 100', () => {
  const arbitraries = [
    arbitraryPropertyConfig().map((c) => ({ ...c, size: 0 })),
    arbitraryGens().filter((gs) => gs.length > 0),
    arbitrarySucceedingPropertyFunction(),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f) => {
      const spies = spyOnAll(gs);
      const p = dev.property(...spies, f);

      p(config);

      const lastSizeByGenerator = spies.map(GenSpy.lastObservedSize);
      expect(lastSizeByGenerator).not.toHaveLength(0);
      lastSizeByGenerator.forEach((lastSize) => {
        expect(lastSize).toEqual((config.iterations - 1) % 100);
      });
    }),
  );
});
