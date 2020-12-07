import { Gen } from 'pbt';
import * as dev from '../../src';
import { expectGen } from '../Helpers/expectGen';

export namespace LocalGen {
  const U_SHORT_MAX = Math.pow(2, 15);

  export const short = (): Gen<number> => Gen.integer().between(U_SHORT_MAX, -U_SHORT_MAX);
}

describe('errors', () => {
  test.property(
    'Gen.float().ofMinPrecision(x), x ∉ ℤ *produces* error; minimum precision must be an integer',
    Gen.integer().greaterThanEqual(0),
    (x) => {
      const x0 = x + 0.1;
      const gen = dev.Gen.float().ofMinPrecision(x0);

      expectGen(gen).toError(`Minimum precision must be an integer, minPrecision = ${x0}`);
    },
  );

  test.property(
    'Gen.float().ofMinPrecision(x), x < 0 *produces* error; minimum precision must be non-negative',
    Gen.integer().lessThanEqual(-1),
    (x) => {
      const gen = dev.Gen.float().ofMinPrecision(x);

      expectGen(gen).toError(`Minimum precision must be non-negative, minPrecision = ${x}`);
    },
  );

  test.property(
    'Gen.float().ofMinPrecision(x), x > 16 *produces* error; minimum precision must not exceed 16 (floating point precision)',
    Gen.integer().greaterThanEqual(17),
    (x) => {
      const gen = dev.Gen.float().ofMinPrecision(x);

      expectGen(gen).toError(`Minimum precision must not exceed 16 (floating point precision), minPrecision = ${x}`);
    },
  );

  test.property(
    'Gen.float().ofMaxPrecision(x), x ∉ ℤ *produces* error; maximum precision must be an integer',
    Gen.integer().greaterThanEqual(0),
    (x) => {
      const x0 = x + 0.1;
      const gen = dev.Gen.float().ofMaxPrecision(x0);

      expectGen(gen).toError(`Maximum precision must be an integer, maxPrecision = ${x0}`);
    },
  );

  test.property(
    'Gen.float().ofMaxPrecision(x), x < 0 *produces* error; maximum precision must be non-negative',
    Gen.integer().lessThanEqual(-1),
    (x) => {
      const gen = dev.Gen.float().ofMaxPrecision(x);

      expectGen(gen).toError(`Maximum precision must be non-negative, maxPrecision = ${x}`);
    },
  );

  test.property(
    'Gen.float().ofMaxPrecision(x), x > 16 *produces* error; maximum precision must not exceed 16 (floating point precision)',
    Gen.integer().greaterThanEqual(17),
    (x) => {
      const gen = dev.Gen.float().ofMaxPrecision(x);

      expectGen(gen).toError(`Maximum precision must not exceed 16 (floating point precision), maxPrecision = ${x}`);
    },
  );

  test.property(
    'Gen.float().greaterThanEqual(x).ofMaxPrecision(y), fractionalPrecisionOf(x) > y *produces* error; bound must be within precision',
    LocalGen.short(),
    Gen.integer().between(0, 10),
    (x, p) => {
      const x0 = x + Math.pow(10, -p - 1);
      const gen = dev.Gen.float().greaterThanEqual(x0).ofMaxPrecision(p);

      expectGen(gen).toError(
        `Bound must be within precision range, minPrecision = 0, maxPrecision = ${p}, min = ${x0}`,
      );
    },
  );

  test.property(
    'Gen.float().lessThanEqual(x).ofMaxPrecision(y), fractionalPrecisionOf(x) > y *produces* error; bound must be within precision',
    LocalGen.short(),
    Gen.integer().between(0, 10),
    (x, p) => {
      const x0 = x + Math.pow(10, -p - 1);
      const gen = dev.Gen.float().lessThanEqual(x0).ofMaxPrecision(p);

      expectGen(gen).toError(
        `Bound must be within precision range, minPrecision = 0, maxPrecision = ${p}, max = ${x0}`,
      );
    },
  );

  test.each<[integerPrecision: number, fractionalPrecision: number, maxMax: number]>([
    [9, 8, 99999999.99999999],
    [8, 9, 9999999.999999999],
    [16, 1, 999999999999999.9],
    [1, 16, 0.9999999999999999],
  ])(
    'Gen.float().lessThanEqual(x).ofMinPrecision(y) *where* x & y overflow floating point precision *produces* error: bound violates minimum precision constraint',
    (integerPrecision, fractionalPrecision, maxMax) => {
      const max = Math.pow(10, integerPrecision);
      const gen = dev.Gen.float().lessThanEqual(max).ofMinPrecision(fractionalPrecision);

      expectGen(gen).toError(
        `Bound violates minimum precision constraint, minPrecision = ${fractionalPrecision}, maxMax = ${maxMax}, receivedMax = ${max}`,
      );
    },
  );

  test.each<[integerPrecision: number, fractionalPrecision: number, minMin: number]>([
    [9, 8, -99999999.99999999],
    [8, 9, -9999999.999999999],
    [16, 1, -999999999999999.9],
    [1, 16, -0.9999999999999999],
  ])(
    'Gen.float().greaterThanEqual(x).ofMinPrecision(y) *where* x & y overflow floating point precision *produces* error: bound violates minimum precision constraint',
    (integerPrecision, fractionalPrecision, minMin) => {
      const min = -Math.pow(10, integerPrecision);
      const gen = dev.Gen.float().greaterThanEqual(min).ofMinPrecision(fractionalPrecision);

      expectGen(gen).toError(
        `Bound violates minimum precision constraint, minPrecision = ${fractionalPrecision}, minMin = ${minMin}, receivedMin = ${min}`,
      );
    },
  );
});
