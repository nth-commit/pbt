import { property } from '../src';
import { stableAssert, stableProperty } from './helpers/stableApi';
import {
  arbitraryExtendableTuple,
  arbitraryPropertyConfig,
  arbitraryGens,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';

test('Given a succeeding property function, the property holds', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stableAssert(
    stableProperty(arb, ([config, gs, f]) => {
      const p = property(...gs, f);

      const result = p(config);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .toArbitrary();

  stableAssert(
    stableProperty(arb, ([config, gs]) => {
      const f = (_: unknown) => false;
      const p = property(...gs, f);

      const result = p(config);

      expect(result).toEqual({ kind: 'failure', problem: { kind: 'predicate' } });
    }),
  );
});
