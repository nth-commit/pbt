import fc from 'fast-check';
import { mean } from 'simple-statistics';
import * as dev from '../../src';
import * as domainGen from '../Helpers/domainGen';
import { mockSeed } from '../Helpers/mocks';
import { failwith } from '../Helpers/failwith';

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const gen = dev.Gen.integer().between(0, 10);

    const sample = dev.sampleTrees(gen, { iterations: 1, advanced: { makeRng: () => mockSeed(i) } });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot(i.toString());
  }
});

test('snapshot, positive range', () => {
  const gen = dev.Gen.integer().between(1, 10);

  const sample = dev.sampleTrees(gen, { iterations: 1, advanced: { makeRng: () => mockSeed(10) } });

  expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot();
});

test('snapshot, negative range', () => {
  const gen = dev.Gen.integer().between(-10, -1);

  const sample = dev.sampleTrees(gen, { iterations: 1, advanced: { makeRng: () => mockSeed(-10) } });

  expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot();
});

test('Gen.integer().between(x, y).growBy(s) *produces* integers in the range [x, y]', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.setOfSize(domainGen.integer(), 2),
      domainGen.scaleMode(),
      (config, [a, b], s) => {
        const [x, y] = [a, b].sort((a, b) => a - b);
        const gen = dev.Gen.integer().between(x, y).growBy(s);

        const sample = dev.sample(gen, config);

        for (const value of sample.values) {
          expect(value).toEqual(Math.round(value));
          expect(value).toBeGreaterThanOrEqual(x);
          expect(value).toBeLessThanOrEqual(y);
        }
      },
    ),
  );
});

test('Gen.integer().between(x, y), x > 0, y >= x = Gen.integer().between(x, y).origin(x) *because* the origin is clipped', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.integer({ min: 1 }),
      domainGen.integer({ min: 1 }),
      (config, a, b) => {
        const [x, y] = [a, b].sort((a, b) => a - b);
        const gen = dev.Gen.integer().between(x, y);
        const genAlt = dev.Gen.integer().between(x, y).origin(x);

        expect(dev.sample(gen, config)).toEqual(dev.sample(genAlt, config));
      },
    ),
  );
});

test('Gen.integer().between(x, y), x < 0, y <= x = Gen.integer().between(x, y).origin(x) *because* the origin is clipped', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.integer({ max: -1 }),
      domainGen.integer({ max: -1 }),
      (config, a, b) => {
        const [x, y] = [a, b].sort((a, b) => b - a);
        const gen = dev.Gen.integer().between(x, y);
        const genAlt = dev.Gen.integer().between(x, y).origin(x);

        expect(dev.sample(gen, config)).toEqual(dev.sample(genAlt, config));
      },
    ),
  );
});

test('Gen.integer().between(x, y).growBy(constant) *produces* integers that are uniformly distributed across the range [x, y]', () => {
  const [config, [a, b]] = fc.sample(
    domainGen.zip(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer({ min: -100, max: 100 }), 2)),
    {
      numRuns: 1,
    },
  )[0];
  const [x, y] = [a, b].sort((a, b) => a - b);
  const gen = dev.Gen.integer().between(x, y).growBy('constant');

  const sample = dev.sample(gen, { ...config, iterations: 10000 });

  const actualMean = mean(sample.values);
  const expectedMean = (y - x) / 2 + x;
  const ratioDifference = Math.abs(expectedMean / actualMean);
  expect(ratioDifference).toBeCloseTo(1, 0);
});

test('Gen.integer().between(x, y).origin(z).growBy(linear), size = 0 *produces* integers equal to z', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer(), 3), (config, [a, b, c]) => {
      const [x, z, y] = [a, b, c].sort((a, b) => a - b);
      const gen = dev.Gen.integer().between(x, y).origin(z).growBy('linear');

      const sample = dev.sample(gen, { ...config, size: 0 });

      for (const value of sample.values) {
        expect(value).toEqual(z);
      }
    }),
  );
});

test('Gen.integer().between(x, y).origin(z).growBy(linear), size = 50 *produces* integers in the lower half of the range', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.setOfSize(domainGen.integer({ min: -100, max: 100 }), 3),
      (config, [a, b, c]) => {
        const [x, z, y] = [a, b, c].sort((a, b) => a - b);
        const gen = dev.Gen.integer().between(x, y).origin(z).growBy('linear');

        const sample = dev.sample(gen, { ...config, size: 50 });

        const leftMidpoint = Math.floor((z - x) / 2 + x);
        const rightMidpoint = Math.ceil((y - z) / 2 + z);
        for (const value of sample.values) {
          expect(value).toBeGreaterThanOrEqual(leftMidpoint);
          expect(value).toBeLessThanOrEqual(rightMidpoint);
        }
      },
    ),
  );
});

test('Gen.integer().between(x, y).growBy(linear), size = 100 *produces* integers that are uniformly distributed across the range [x, y]', () => {
  const [config, [a, b]] = fc.sample(
    domainGen.zip(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer({ min: -100, max: 100 }), 3)),
    {
      numRuns: 1,
    },
  )[0];
  const [x, y] = [a, b].sort((a, b) => a - b);
  const gen = dev.Gen.integer().between(x, y).growBy('linear');

  const sample = dev.sample(gen, { ...config, size: 100, iterations: 10000 });

  const actualMean = mean(sample.values);
  const expectedMean = (y - x) / 2 + x;
  const ratioDifference = Math.abs(expectedMean / actualMean);
  expect(ratioDifference).toBeCloseTo(1, 0);
});

describe('defaults', () => {
  test('default(min) = -2,147,483,648 *because* we arbitrarily selected the default range to be int32', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), (config) => {
        const genDefault = dev.Gen.integer();
        const genAlt = dev.Gen.integer().greaterThanEqual(-2_147_483_648);

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genAlt, config));
      }),
    );
  });

  test('default(max) = 2,147,483,648 *because* we arbitrarily selected the default range to be int32', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), (config) => {
        const genDefault = dev.Gen.integer();
        const genLinear = dev.Gen.integer().lessThanEqual(2_147_483_648);

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genLinear, config));
      }),
    );
  });

  test('default(origin) = 0', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), (config) => {
        const genDefault = dev.Gen.integer();
        const genLinear = dev.Gen.integer().origin(0);

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genLinear, config));
      }),
    );
  });

  test('default(scale) = linear', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), (config) => {
        const genDefault = dev.Gen.integer();
        const genLinear = dev.Gen.integer().growBy('linear');

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genLinear, config));
      }),
    );
  });
});

describe('equivalent APIs', () => {
  test('Gen.integer().between(x, y) = Gen.integer().greaterThanEqual(x).lessThanEqual(y)', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.integer(), domainGen.integer(), (config, x, y) => {
        const genBetween = dev.Gen.integer().between(x, y);
        const genBetweenAlt = dev.Gen.integer().greaterThanEqual(x).lessThanEqual(y);

        expect(dev.sample(genBetween, config)).toEqual(dev.sample(genBetweenAlt, config));
      }),
    );
  });

  test('Gen.integer().between(x, y) = Gen.integer().between(y, x) *because* it is resilient to parameter order', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer(), 3), (config, [a, b, c]) => {
        const [x, z, y] = [a, b, c].sort((a, b) => a - b);
        const gen = dev.Gen.integer().origin(z);
        const genBetween = gen.between(x, y);
        const genBetweenAlt = gen.between(y, x);

        expect(dev.sample(genBetween, config)).toEqual(dev.sample(genBetweenAlt, config));
      }),
    );
  });
});

describe('errors', () => {
  test('Gen.integer().greaterThanEqual(x), x ∉ ℤ *produces* error; minimum must be an integer', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.decimalWithAtLeastOneDp(), (config, x) => {
        const gen = dev.Gen.integer().greaterThanEqual(x);

        expect(() => dev.sample(gen, config)).toThrow('Minimum must be an integer');
      }),
    );
  });

  test('Gen.integer().lessThanEqual(x), x ∉ ℤ *produces* error; maximum must be an integer', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.decimalWithAtLeastOneDp(), (config, x) => {
        const gen = dev.Gen.integer().lessThanEqual(x);

        expect(() => dev.sample(gen, config)).toThrow('Maximum must be an integer');
      }),
    );
  });

  test('Gen.integer().origin(x), x ∉ ℤ *produces* error; origin must be an integer', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.decimalWithAtLeastOneDp(), (config, x) => {
        const gen = dev.Gen.integer().origin(x);

        expect(() => dev.sample(gen, config)).toThrow('Origin must be an integer');
      }),
    );
  });

  test('Gen.integer().between(x, y).origin(z), z ∉ [x..y] *produces* error; origin must be in range', () => {
    fc.assert(
      fc.property(
        domainGen.sampleConfig(),
        domainGen.setOfSize(domainGen.integer(), 3),
        domainGen.element([-1, 1]),
        (config, [a, b, c], sortOrder) => {
          const [x, y, z] = [a, b, c].sort((a, b) => (a - b) * sortOrder);
          const gen = dev.Gen.integer().between(x, y).origin(z);

          expect(() => dev.sample(gen, config)).toThrow('Origin must be in range');
        },
      ),
    );
  });
});

describe('shrinks', () => {
  test('Gen.integer().origin(z) *produces* values that shrink to z', () => {
    fc.assert(
      fc.property(domainGen.checkConfig(), domainGen.integer(), domainGen.faillingFunc(), (config, z, f) => {
        const gen = dev.Gen.integer().origin(z);

        const checkResult = dev.check(dev.property(gen, f), config);

        const expectedCounterexample: dev.Counterexample<[number]> = {
          path: expect.anything(),
          reason: expect.anything(),
          complexity: 0,
          value: [z],
        };
        if (checkResult.kind !== 'falsified') return failwith('expected falsified');
        expect(checkResult.counterexample).toEqual(expectedCounterexample);
      }),
    );
  });
});
