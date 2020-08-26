import * as fc from 'fast-check';
import { property } from '../src';
import {
  arbitraryDecimal,
  arbitraryExtendableTuple,
  arbitraryGens,
  arbitraryPropertyConfig,
  arbitraryPropertyFunction,
} from './helpers/arbitraries';
import { DEFAULT_MAX_ITERATIONS } from './helpers/constants';

test('Given iterations = 0, the property returns a validation failure', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, gs, f]) => {
      const p = property(...gs, f);

      const result = p({ ...config, iterations: 0 });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'iterations',
          message: 'Number of iterations must be greater than 0',
        },
      });
    }),
  );
});

test('Given iterations < 0, the property returns a validation failure', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => fc.integer(-1))
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, gs, f, iterations]) => {
      const p = property(...gs, f);

      const result = p({ ...config, iterations });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'iterations',
          message: 'Number of iterations must be greater than 0',
        },
      });
    }),
  );
});

test('Given iterations is a decimal, the property returns a validation failure', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => arbitraryDecimal(1, DEFAULT_MAX_ITERATIONS))
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, gs, f, iterations]) => {
      const p = property(...gs, f);

      const result = p({ ...config, iterations });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'iterations',
          message: 'Number of iterations must be an integer',
        },
      });
    }),
  );
});
