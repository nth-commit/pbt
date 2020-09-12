import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  arbitraryPropertyConfig,
  arbitraryGenValue,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
  arbitraryGens,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGenValue(), arbitraryPropertyFunction()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, x, f) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = dev.property(GenStub.singleton(x), spyF);

      p({ ...config, iterations: 1 });

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('Given a succeeding property function, the test function is only called once for each iteration', () => {
  const arbitraries = [arbitraryPropertyConfig(), arbitraryGens(), arbitrarySucceedingPropertyFunction()] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f) => {
      const spyF = jest.fn(f);
      const p = dev.property(...gs, spyF);

      p(config);

      expect(spyF).toHaveBeenCalledTimes(config.iterations);
    }),
  );
});
