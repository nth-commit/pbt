import * as devCore from 'pbt-core';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryPropertyConfig,
  arbitraryGenValue,
  arbitraryGens,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
  arbitrarilyShuffleArray,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';
import fc from 'fast-check';

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

test('Given an exhausting generator, the property does not hold', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(
      ({ iterations }) =>
        arbitraryGens({ minLength: iterations })
          .map((gs) => [...gs, GenStub.exhausted()])
          .chain(arbitrarilyShuffleArray) as fc.Arbitrary<devCore.Gens>,
    )
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f]) => {
      const p = dev.property(...gs, f);

      const result = p(config);

      expect(result).toEqual({
        kind: 'failure',
        problem: {
          kind: 'exhaustion',
          iterationsRequested: config.iterations,
          iterationsCompleted: 0,
        },
      });
    }),
  );
});