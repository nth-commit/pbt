import * as fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  extendableArbitrary,
  arbitraryPropertyConfig,
  arbitraryGens,
  arbitraryPropertyFunction,
  arbitraryDecimal,
} from './helpers/arbitraries';
import { DEFAULT_MAX_ITERATIONS } from './helpers/constants';

test('Given iterations is a decimal, the property returns a validation failure', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => arbitraryDecimal(1, DEFAULT_MAX_ITERATIONS))
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f, iterations]) => {
      const p = dev.property(...gs, f);

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

test('Given iterations <= 0, the property returns a validation failure', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => fc.oneof(fc.constant(0), fc.integer(0)))
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f, iterations]) => {
      const p = dev.property(...gs, f);

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

test('Given size is a decimal, the property returns a validation failure', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => arbitraryDecimal(0, 100))
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f, size]) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, size });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'size',
          message: 'Size must be an integer',
        },
      });
    }),
  );
});

test('Given size < 0, the property returns a validation failure', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => fc.oneof(fc.constant(-1), fc.integer(-1)))
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f, size]) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, size });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'size',
          message: 'Size must be greater than or equal to 0',
        },
      });
    }),
  );
});

test('Given size > 100, the property returns a validation failure', () => {
  const arb = extendableArbitrary()
    .extend(() => arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations }))
    .extend(() => arbitraryPropertyFunction())
    .extend(() => fc.oneof(fc.constant(101), fc.integer(101, Number.MAX_SAFE_INTEGER)))
    .toArbitrary();

  stable.assert(
    stable.property(arb, ([config, gs, f, size]) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, size });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'size',
          message: 'Size must be less than or equal to 100',
        },
      });
    }),
  );
});
