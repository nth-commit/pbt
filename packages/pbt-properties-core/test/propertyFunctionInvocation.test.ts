import * as fc from 'fast-check';
import { property } from '../src';
import {
  arbitraryGenValue,
  arbitraryPropertyFixture,
  arbitraryPropertyFunction,
  arbitrarySeed,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  fc.assert(
    fc.property(arbitrarySeed(), arbitraryPropertyFunction(), arbitraryGenValue(), (seed, f, x) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.singleton(x), spyF);

      p({ iterations: 1, seed });

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('The test function is only called once for each iteration for a succeeding property', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), arbitrarySucceedingPropertyFunction(), (config, f) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.fromArray(config.values), spyF);

      p(config);

      expect(spyF).toHaveBeenCalledTimes(config.iterations);
    }),
  );
});
