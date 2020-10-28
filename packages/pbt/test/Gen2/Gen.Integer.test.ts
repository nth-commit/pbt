import fc from 'fast-check';
import { mean } from 'simple-statistics';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';
import { mockSeed } from './Helpers/mocks';
import { failwith } from './Helpers/failwith';

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const seed = mockSeed(i);
    const gen = dev.Gen.integer().between(0, 10);

    const sampleResult = dev.sampleTrees(gen, { seed, iterations: 1 });

    if (sampleResult.kind !== 'success') return failwith('Expected success');
    expect(dev.GenTree.format(sampleResult.trees[0])).toMatchSnapshot(i.toString());
  }
});

test('default(min) = -2,147,483,648 *because* we arbitrarily selected the default range to be int32', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), (config) => {
      const genDefault = dev.Gen.integer();
      const genLinear = dev.Gen.integer().greaterThanEqual(-2_147_483_648);

      expect(dev.sample(genDefault, config)).toEqual(dev.sample(genLinear, config));
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

test('between(x, y) = greaterThanEqual(x).lessThanEqual(y)', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.integer(), domainGen.integer(), (config, x, y) => {
      const genBetween = dev.Gen.integer().between(x, y);
      const genBetweenAlt = dev.Gen.integer().greaterThanEqual(x).lessThanEqual(y);

      expect(dev.sample(genBetween, config)).toEqual(dev.sample(genBetweenAlt, config));
    }),
  );
});

test('between(x, y) = between(y, x) *because* it is resilient to parameter order', () => {
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

test('between(x, y).origin(z), z ∉ [x..y] *produces* error; origin must be in range', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.setOfSize(domainGen.integer(), 3),
      domainGen.element([-1, 1]),
      (config, [a, b, c], sortOrder) => {
        const [x, y, z] = [a, b, c].sort((a, b) => (a - b) * sortOrder);
        const gen = dev.Gen.integer().between(x, y).origin(z);

        const sampleResult = dev.sample(gen, config);

        const expectedSampleResult: dev.SampleResult<number> = {
          kind: 'error',
          message: expect.stringMatching('Origin must be in range'),
        };
        expect(sampleResult).toEqual(expectedSampleResult);
      },
    ),
  );
});

// TODO: Return errors when min/max/origin are not integers

test('between(x, y), 0 ∉ [x..y] = between(x, y).origin(x) *because* if the origin is not set, and the range is shifted, we adjust the origin to the minimum', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.choose(
        domainGen.setOfSize(domainGen.integer({ min: 1 }), 2),
        domainGen.setOfSize(domainGen.integer({ max: -1 }), 2),
      ),
      (config, [a, b]) => {
        const [x, y] = [a, b].sort((a, b) => a - b);
        const gen = dev.Gen.integer().between(x, y);
        const genAlt = gen.origin(x);

        expect(dev.sample(gen, config)).toEqual(dev.sample(genAlt, config));
      },
    ),
  );
});

test('between(x, y).growBy(s) *produces* integers in the range [x, y]', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.setOfSize(domainGen.integer(), 2),
      domainGen.scaleMode(),
      (config, [a, b], s) => {
        const [x, y] = [a, b].sort((a, b) => a - b);
        const gen = dev.Gen.integer().between(x, y).growBy(s);

        const sampleResult = dev.sample(gen, config);

        if (sampleResult.kind !== 'success') return failwith('Expected success');
        for (const value of sampleResult.values) {
          expect(value).toEqual(Math.round(value));
          expect(value).toBeGreaterThanOrEqual(x);
          expect(value).toBeLessThanOrEqual(y);
        }
      },
    ),
  );
});

test('between(x, y).growBy(constant) *produces* integers that are uniformly distributed across the range [x, y]', () => {
  const [config, [a, b]] = fc.sample(
    domainGen.zip(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer({ min: -100, max: 100 }), 2)),
    {
      numRuns: 1,
    },
  )[0];
  const [x, y] = [a, b].sort((a, b) => a - b);
  const gen = dev.Gen.integer().between(x, y).growBy('constant');

  const sampleResult = dev.sample(gen, { ...config, iterations: 10000 });

  if (sampleResult.kind !== 'success') return failwith('Expected success');
  const actualMean = mean(sampleResult.values);
  const expectedMean = (y - x) / 2 + x;
  const ratioDifference = Math.abs(expectedMean / actualMean);
  expect(ratioDifference).toBeCloseTo(1, 0);
});

test('between(x, y).origin(z).growBy(linear), size = 0 *produces* integers equal to z', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer(), 3), (config, [a, b, c]) => {
      const [x, z, y] = [a, b, c].sort((a, b) => a - b);
      const gen = dev.Gen.integer().between(x, y).origin(z).growBy('linear');

      const sampleResult = dev.sample(gen, { ...config, size: 0 });

      if (sampleResult.kind !== 'success') return failwith('Expected success');
      for (const value of sampleResult.values) {
        expect(value).toEqual(z);
      }
    }),
  );
});

test('between(x, y).origin(z).growBy(linear), size = 50 *produces* integers in the lower half of the range', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.setOfSize(domainGen.integer({ min: -100, max: 100 }), 3),
      (config, [a, b, c]) => {
        const [x, z, y] = [a, b, c].sort((a, b) => a - b);
        const gen = dev.Gen.integer().between(x, y).origin(z).growBy('linear');

        const sampleResult = dev.sample(gen, { ...config, size: 50 });

        if (sampleResult.kind !== 'success') return failwith('Expected success');
        const leftMidpoint = Math.floor((z - x) / 2 + x);
        const rightMidpoint = Math.ceil((y - z) / 2 + z);
        for (const value of sampleResult.values) {
          expect(value).toBeGreaterThanOrEqual(leftMidpoint);
          expect(value).toBeLessThanOrEqual(rightMidpoint);
        }
      },
    ),
  );
});

test('between(x, y).growBy(linear), size = 100 *produces* integers that are uniformly distributed across the range [x, y]', () => {
  const [config, [a, b]] = fc.sample(
    domainGen.zip(domainGen.sampleConfig(), domainGen.setOfSize(domainGen.integer({ min: -100, max: 100 }), 3)),
    {
      numRuns: 1,
    },
  )[0];
  const [x, y] = [a, b].sort((a, b) => a - b);
  const gen = dev.Gen.integer().between(x, y).growBy('linear');

  const sampleResult = dev.sample(gen, { ...config, size: 100, iterations: 10000 });

  if (sampleResult.kind !== 'success') return failwith('Expected success');
  const actualMean = mean(sampleResult.values);
  const expectedMean = (y - x) / 2 + x;
  const ratioDifference = Math.abs(expectedMean / actualMean);
  expect(ratioDifference).toBeCloseTo(1, 0);
});
