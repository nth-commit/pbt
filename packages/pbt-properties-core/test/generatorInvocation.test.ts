import { property } from '../src';
import { stableAssert, stableProperty } from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryPropertyConfig,
  arbitraryGen,
  arbitraryPropertyFunction,
} from './helpers/arbitraries';

test('The generator receives the seed', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
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
