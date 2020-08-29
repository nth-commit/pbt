import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryPropertyConfig,
  arbitraryGen,
  arbitraryGens,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { spyOn, spyOnAll } from './helpers/spies';

test('The generator receives the seed and the size', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(() => arbitraryGen())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, g, f]) => {
      const spy = spyOn(g);
      const p = dev.property(spy, f);

      p({ ...config, iterations: 1 });

      expect(spy).toBeCalledTimes(1);
      expect(spy).toBeCalledWith(config.seed, config.size);
    }),
  );
});

test('The generator is invoked for each iteration for a succeeding property', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f]) => {
      const spies = spyOnAll(gs);
      const p = dev.property(...spies, f);

      p(config);

      const callsByGenerator = spies.map((spy) => spy.mock.calls);
      callsByGenerator.forEach((calls) => {
        expect(calls).toHaveLength(config.iterations);
      });
    }),
  );
});

test('The generator always receives a size, 0 <= s <= 100', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(() => arbitraryGens())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f]) => {
      const spies = spyOnAll(gs);
      const p = dev.property(...spies, f);

      p(config);

      const allSizes = ([] as number[]).concat(...spies.map((spy) => spy.mock.calls.map((c) => c[1])));
      expect(allSizes).not.toHaveLength(0);
      allSizes.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      });
    }),
  );
});
