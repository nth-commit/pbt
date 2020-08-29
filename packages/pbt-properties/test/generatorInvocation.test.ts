import * as devCore from 'pbt-core';
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

type GenSpy<T> = devCore.Gen<T> & {
  getInvocations(): Array<[devCore.Seed, devCore.Size]>;
  getSeeds(): devCore.Seed[];
  getSizes(): devCore.Size[];
};

const spyOnGen = <T>(g: devCore.Gen<T>): GenSpy<T> => {
  const gFn = jest.fn(g);
  const gSpy = (gFn as unknown) as GenSpy<T>;

  gSpy.getInvocations = () => gFn.mock.calls;
  gSpy.getSeeds = () => gSpy.getInvocations().map((args) => args[0]);
  gSpy.getSizes = () => gSpy.getInvocations().map((args) => args[1]);

  return gSpy;
};

const spyOnGens = (gs: devCore.Gens): [GenSpy<any>, ...GenSpy<any>[]] =>
  gs.map(spyOnGen) as [GenSpy<any>, ...GenSpy<any>[]];

test('The generator receives the seed and the size', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(() => arbitraryGen())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, g, f]) => {
      const gSpy = jest.fn(g) as devCore.Gen<unknown>;
      const p = dev.property(gSpy, f);

      p({ ...config, iterations: 1 });

      expect(gSpy).toBeCalledTimes(1);
      expect(gSpy).toBeCalledWith(config.seed, config.size);
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
      const gSpies = spyOnGens(gs);
      const p = dev.property(...gSpies, f);

      p(config);

      const invocationsByGenerator = gSpies.map((gSpy) => gSpy.getInvocations());
      invocationsByGenerator.forEach((invocations) => {
        expect(invocations).toHaveLength(config.iterations);
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
      const gSpies = spyOnGens(gs);
      const p = dev.property(...gSpies, f);

      p(config);

      const allSizes = ([] as number[]).concat(...gSpies.map((gSpy) => gSpy.getSizes()));
      expect(allSizes).not.toHaveLength(0);
      allSizes.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      });
    }),
  );
});
