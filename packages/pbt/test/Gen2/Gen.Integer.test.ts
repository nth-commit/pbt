import fc from 'fast-check';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';
import { mockSeed } from './Helpers/mocks';
import { failwith } from './Helpers/failwith';

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const seed = mockSeed(i);
    const gen = dev.Gen.integer().between(0, 10);

    const result = dev.sampleTrees(gen, { seed, iterations: 1 });

    if (result.kind !== 'success') return failwith('Expected success');
    expect(dev.GenTree.format(result.trees[0])).toMatchSnapshot(i.toString());
  }
});

test('default(min) = -2,147,483,648 *because* we arbitrarily selected minimum int32', () => {
  fc.assert(
    fc.property(domainGen.sampleFunc(), (sampleFunc) => {
      const genDefault = dev.Gen.integer();
      const genLinear = dev.Gen.integer().greaterThanEqual(-2_147_483_648);

      expect(sampleFunc(genDefault)).toEqual(sampleFunc(genLinear));
    }),
  );
});

test('default(max) = 2,147,483,648 *because* we arbitrarily selected maximum int32', () => {
  fc.assert(
    fc.property(domainGen.sampleFunc(), (sampleFunc) => {
      const genDefault = dev.Gen.integer();
      const genLinear = dev.Gen.integer().lessThanEqual(2_147_483_648);

      expect(sampleFunc(genDefault)).toEqual(sampleFunc(genLinear));
    }),
  );
});

test('default(origin) = 0', () => {
  fc.assert(
    fc.property(domainGen.sampleFunc(), (sampleFunc) => {
      const genDefault = dev.Gen.integer();
      const genLinear = dev.Gen.integer().origin(0);

      expect(sampleFunc(genDefault)).toEqual(sampleFunc(genLinear));
    }),
  );
});

test('default(scale) = linear', () => {
  fc.assert(
    fc.property(domainGen.sampleFunc(), (sampleFunc) => {
      const genDefault = dev.Gen.integer();
      const genLinear = dev.Gen.integer().growsBy('linear');

      expect(sampleFunc(genDefault)).toEqual(sampleFunc(genLinear));
    }),
  );
});

test('between(x, y) = greaterThanEqual(x).lessThanEqual(y)', () => {
  fc.assert(
    fc.property(domainGen.sampleFunc(), domainGen.integer(), domainGen.integer(), (sampleFunc, x, y) => {
      const genBetween = dev.Gen.integer().between(x, y);
      const genBetweenAlt = dev.Gen.integer().greaterThanEqual(x).lessThanEqual(y);

      expect(sampleFunc(genBetween)).toEqual(sampleFunc(genBetweenAlt));
    }),
  );
});

test('between(x, y) = between(y, x) *because* it is resilient to parameter order', () => {
  fc.assert(
    fc.property(domainGen.sampleFunc(), domainGen.setOfSize(domainGen.integer(), 3), (sampleFunc, [a, b, c]) => {
      const [x, z, y] = [a, b, c].sort((a, b) => a - b);
      const gen = dev.Gen.integer().origin(z);
      const genBetween = gen.between(x, y);
      const genBetweenAlt = gen.between(y, x);

      expect(sampleFunc(genBetween)).toEqual(sampleFunc(genBetweenAlt));
    }),
  );
});

test('between(x, y).origin(z), z ∉ [x..y] *produces* error; origin must be in range', () => {
  fc.assert(
    fc.property(
      domainGen.sampleFunc(),
      domainGen.setOfSize(domainGen.integer(), 3),
      domainGen.element([-1, 1]),
      (sampleFunc, [a, b, c], sortOrder) => {
        const [x, y, z] = [a, b, c].sort((a, b) => (a - b) * sortOrder);
        const gen = dev.Gen.integer().between(x, y).origin(z);

        const sampleResult = sampleFunc(gen);

        const expectedSampleResult: dev.SampleResult<number> = {
          kind: 'error',
          message: expect.stringMatching('Origin must be in range'),
        };
        expect(sampleResult).toEqual(expectedSampleResult);
      },
    ),
  );
});
