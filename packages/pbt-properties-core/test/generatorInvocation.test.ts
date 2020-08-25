import * as fc from 'fast-check';
import { property } from '../src';
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

  fc.assert(
    fc.property(arb, ([config, g, f]) => {
      const spyGen = jest.fn(g);
      const p = property(spyGen, f);

      p(config);

      expect(spyGen).toBeCalledTimes(1);
      expect(spyGen).toBeCalledWith(config.seed, 0);
    }),
  );
});

test('Fail', () => {
  expect(true).toEqual(false);
});
