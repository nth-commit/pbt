import fc from 'fast-check';
import * as dev from '../src';
import * as devCore from 'pbt-core';
import * as stable from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryGens,
  arbitrarySucceedingPropertyFunction,
  arbitraryPropertyConfig,
  arbitrarilyShuffleArray,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('Given a succeeding property function, the property holds', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f]) => {
      const p = dev.property(...gs, f);

      const result = p(config);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs]) => {
      const f = (_: unknown) => false;
      const p = dev.property(...gs, f);

      const result = p(config);

      expect(result).toMatchObject({ kind: 'failure', problem: { kind: 'predicate' } });
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
