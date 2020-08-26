import { property } from '../src';
import { stableAssert, stableProperty } from './helpers/stableApi';
import {
  arbitraryExtendableTuple,
  arbitraryPropertyConfig,
  arbitraryGen,
  arbitraryPropertyFunction,
} from './helpers/arbitraries';

test('The generator receives the seed', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(() => arbitraryGen())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stableAssert(
    stableProperty(arb, ([config, g, f]) => {
      const spyGen = jest.fn(g);
      const p = property(spyGen, f);

      p(config);

      expect(spyGen).toBeCalledTimes(1);
      expect(spyGen).toBeCalledWith(config.seed, 0);
    }),
  );
});
