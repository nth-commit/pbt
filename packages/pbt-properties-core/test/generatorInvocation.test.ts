import * as devGenerators from 'pbt-generator-core';
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

type GenSpy<T> = devGenerators.Gen<T> & {
  getSizes(): number[];
};

const spyGen = <T>(g: devGenerators.Gen<T>): GenSpy<T> => {
  const gFn = jest.fn(g);
  const gSpy = (gFn as unknown) as GenSpy<T>;

  gSpy.getSizes = () => gFn.mock.calls.map((args) => args[1]);

  return gSpy;
};

test('The generator receives the seed', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(() => arbitraryGen())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, g, f]) => {
      const gSpy = jest.fn(g);
      const p = dev.property(gSpy, f);

      p(config);

      expect(gSpy).toBeCalledTimes(1);
      expect(gSpy).toBeCalledWith(config.seed, expect.anything());
    }),
  );
});
