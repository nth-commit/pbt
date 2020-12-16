import { Big } from 'big.js';
import { Gen } from 'pbt';
import * as dev from '../../src';
import { expectGen } from '../Helpers/expectGen';

test('Gen.float().between(0, 10).betweenPrecision(0, 2)', () => {
  for (let i = 0; i <= 10; i++) {
    const gen = dev.Gen.float().between(0, 10).betweenPrecision(0, 2);

    const sample = dev.sampleTrees(gen, { iterations: 1, seed: i });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot(i.toString());
  }
});

test('Gen.float().between(0, 10).betweenPrecision(1, 2)', () => {
  for (let i = 0; i <= 10; i++) {
    const gen = dev.Gen.float().between(0, 10).betweenPrecision(1, 2);

    const sample = dev.sampleTrees(gen, { iterations: 1, seed: i });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot(i.toString());
  }
});

test('Gen.float().between(1, 10).betweenPrecision(0, 2)', () => {
  for (let i = 0; i <= 10; i++) {
    const gen = dev.Gen.float().between(1, 10).betweenPrecision(0, 2);

    const sample = dev.sampleTrees(gen, { iterations: 1, seed: 0 });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot();
  }
});

test('Gen.float().between(-10, -1).betweenPrecision(0, 2)', () => {
  for (let i = 0; i <= 10; i++) {
    const gen = dev.Gen.float().between(-10, -1).betweenPrecision(0, 2);

    const sample = dev.sampleTrees(gen, { iterations: 1, seed: i });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot();
  }
});

describe('errors', () => {
  test.property(
    'Gen.float().ofMinPrecision(x), x ∉ ℤ *produces* error; minimum precision must be a non-negative integer',
    Gen.float().greaterThanEqual(0).ofMinPrecision(1),
    (x) => {
      const gen = dev.Gen.float().ofMinPrecision(x);

      expectGen(gen).toError(`Minimum precision must be a non-negative integer, minPrecision = ${x}`);
    },
  );

  test.property(
    'Gen.float().ofMinPrecision(x), x < 0 *produces* error; minimum precision must be a non-negative integer',
    Gen.integer().lessThanEqual(-1),
    (x) => {
      const gen = dev.Gen.float().ofMinPrecision(x);

      expectGen(gen).toError(`Minimum precision must be a non-negative integer, minPrecision = ${x}`);
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
    'Gen.float().ofMaxPrecision(x), x ∉ ℤ *produces* error; maximum precision must be a non-negative integer',
    Gen.float().greaterThanEqual(0).ofMinPrecision(1),
    (x) => {
      const gen = dev.Gen.float().ofMaxPrecision(x);

      expectGen(gen).toError(`Maximum precision must be a non-negative integer, maxPrecision = ${x}`);
    },
  );

  test.property(
    'Gen.float().ofMaxPrecision(x), x < 0 *produces* error; maximum precision must be a non-negative integer',
    Gen.integer().lessThanEqual(-1),
    (x) => {
      const gen = dev.Gen.float().ofMaxPrecision(x);

      expectGen(gen).toError(`Maximum precision must be a non-negative integer, maxPrecision = ${x}`);
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
    'Gen.float().greaterThanEqual(x).ofMaxPrecision(y), fractionalPrecisionOf(x) > y *produces* error; bound violates maximum precision constraint',
    Gen.integer()
      .between(0, 5)
      .flatMap((maxPrecision) =>
        Gen.float()
          .ofMinPrecision(maxPrecision + 2) // TODO: This should be +1, but there is a bug in current version of float gen
          .map((min) => [min, maxPrecision]),
      ),
    ([min, maxPrecision]) => {
      const gen = dev.Gen.float().greaterThanEqual(min).ofMaxPrecision(maxPrecision);

      expectGen(gen).toError(
        `Bound violates maximum precision constraint, minPrecision = 0, maxPrecision = ${maxPrecision}, min = ${min}`,
      );
    },
  );

  test.property(
    'Gen.float().lessThanEqual(x).ofMaxPrecision(y), fractionalPrecisionOf(x) > y *produces* error; bound violates maximum precision constraint',
    Gen.integer()
      .between(0, 5)
      .flatMap((maxPrecision) =>
        Gen.float()
          .ofMinPrecision(maxPrecision + 2) // TODO: This should be +1, but there is a bug in current version of float gen
          .map((max) => [max, maxPrecision]),
      ),
    ([max, maxPrecision]) => {
      const gen = dev.Gen.float().lessThanEqual(max).ofMaxPrecision(maxPrecision);

      expectGen(gen).toError(
        `Bound violates maximum precision constraint, minPrecision = 0, maxPrecision = ${maxPrecision}, max = ${max}`,
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
        `Bound violates minimum precision constraint, minPrecision = ${fractionalPrecision}, max = ${max}`,
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
        `Bound violates minimum precision constraint, minPrecision = ${fractionalPrecision}, min = ${min}`,
      );
    },
  );
});

test.skip
  .property(
    'Gen.float().ofMinPrecision(p) *produces* values where fractional precision >= p',
    Gen.integer().between(1, 16),
    (p) => {
      const gen = dev.Gen.float().ofMinPrecision(p);

      expectGen(gen).assertOnValues((x) => {
        const rounded = Big(x).round(p - 1);

        expect(x).not.toEqual(rounded.toNumber());
      });
    },
  )
  .config({ seed: 1608149030104, size: 0, path: '' });
