import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryPropertyConfig,
  arbitraryGenValue,
  arbitraryGens,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(() => arbitraryGenValue())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, x, f]) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = dev.property(GenStub.singleton(x), spyF);

      p({ ...config, iterations: 1 });

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('Given a succeeding property function, the test function is only called once for each iteration', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f]) => {
      const spyF = jest.fn(f);
      const p = dev.property(...gs, spyF);

      p(config);

      expect(spyF).toHaveBeenCalledTimes(config.iterations);
    }),
  );
});
