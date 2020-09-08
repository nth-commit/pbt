import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryPropertyConfig,
  arbitraryGens,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';

test('Given a succeeding property function, the property holds', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
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
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
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
