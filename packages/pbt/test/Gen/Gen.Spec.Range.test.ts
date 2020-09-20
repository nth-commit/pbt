import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens_Ranged, Gens_Ranged_Constant, Gens_Ranged_Linear } from './Gen.Spec';
import { runSucceedingGen } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';
import { analyzeUniformDistribution } from './Helpers/statistics';

type MetaGen<T> = fc.Arbitrary<{
  min: number;
  max: number;
  gen: dev.Gen<T>;
}>;

type RangeFixture<T> = {
  getOrder: (x: T) => number;
  makeGen: (min: number, max: number) => dev.Gen<T>;
};

const id = <T>(x: T) => x;

const makeNumericRangeFixture = (makeGen: (min: number, max: number) => dev.Gen<number>): RangeFixture<number> => {
  return {
    getOrder: id,
    makeGen,
  };
};

const createMetaGen = <T>(makeGen: (min: number, max: number) => dev.Gen<T>): MetaGen<T> =>
  fc.tuple(domainGen.naturalNumber(), domainGen.naturalNumber()).map(([a, b]) => {
    const min = a < b ? a : b;
    const max = a > b ? a : b;
    return {
      gen: makeGen(min, max),
      min,
      max,
    };
  });

const rangeFixtures: Record<Gens_Ranged, RangeFixture<any>> = {
  'integer.unscaled': makeNumericRangeFixture(dev.integer.unscaled),
  'integer.scaleLinearly': makeNumericRangeFixture(dev.integer.scaleLinearly),
};

const constantRangeFixtures: Record<Gens_Ranged_Constant, RangeFixture<any>> = {
  'integer.unscaled': rangeFixtures['integer.unscaled'],
};

const linearRangeFixtures: Record<Gens_Ranged_Linear, RangeFixture<any>> = {
  'integer.scaleLinearly': rangeFixtures['integer.scaleLinearly'],
};

test.each(Object.keys(rangeFixtures))('It is generates instances in the range (%s)', (genLabel: string) => {
  const { getOrder, makeGen } = rangeFixtures[genLabel as Gens_Ranged];

  fc.assert(
    fc.property(domainGen.runParams(), createMetaGen(makeGen), (runParams, { gen, min, max }) => {
      const xs = runSucceedingGen(gen, runParams).map(getOrder);

      xs.forEach((x) => {
        expect(x).toBeGreaterThanOrEqual(min);
        expect(x).toBeLessThanOrEqual(max);
      });
    }),
    {
      numRuns: 1,
    },
  );
});

test.each(Object.keys(constantRangeFixtures))(
  'For constant ranges, it generates instances with a uniformly distributed order',
  (genLabel: string) => {
    const { getOrder, makeGen } = rangeFixtures[genLabel as Gens_Ranged];

    const min = 0;
    const max = 1000;
    const sampleSize = 1000;

    const genRunParams = domainGen.runParams().map((runParams) => ({ ...runParams, iterations: sampleSize }));

    fc.assert(
      fc.property(genRunParams, (runParams) => {
        const gen = makeGen(min, max);

        const xs = runSucceedingGen(gen, runParams).map(getOrder);

        const { pValue } = analyzeUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.01);
      }),
      {
        numRuns: 1,
      },
    );
  },
);

test.each(Object.keys(linearRangeFixtures))(
  'For linear ranges, when size = 0, it generates instances with an order equal to the min',
  (genLabel: string) => {
    const { getOrder, makeGen } = rangeFixtures[genLabel as Gens_Ranged];

    const genRunParams = domainGen.runParams().map<domainGen.GenRunParams>((runParams) => ({ ...runParams, size: 0 }));

    fc.assert(
      fc.property(genRunParams, createMetaGen(makeGen), (runParams, { gen, min }) => {
        const xs = runSucceedingGen(gen, runParams).map(getOrder);

        xs.forEach((x) => {
          expect(x).toEqual(min);
        });
      }),
    );
  },
);

test.each(Object.keys(linearRangeFixtures))(
  'For linear ranges, when size = 50, it generates numbers in approximately the lower half of the range',
  (genLabel: string) => {
    const { getOrder, makeGen } = rangeFixtures[genLabel as Gens_Ranged];

    const genRunParams = domainGen.runParams().map<domainGen.GenRunParams>((runParams) => ({ ...runParams, size: 50 }));

    fc.assert(
      fc.property(genRunParams, createMetaGen(makeGen), (runParams, { gen, min, max }) => {
        const rangeSize = max - min;
        const halfMax = min + Math.ceil(rangeSize / 2);

        const xs = runSucceedingGen(gen, runParams).map(getOrder);

        xs.forEach((x) => {
          expect(x).toBeLessThanOrEqual(halfMax);
        });
      }),
    );
  },
);

test.each(Object.keys(linearRangeFixtures))(
  'For linear ranges, when size = 100, it generates instances with a uniformly distributed order',
  (genLabel: string) => {
    const { getOrder, makeGen } = rangeFixtures[genLabel as Gens_Ranged];

    const min = 0;
    const max = 1000;
    const sampleSize = 1000;

    const genRunParams = domainGen
      .runParams()
      .map((runParams) => ({ ...runParams, size: 100, iterations: sampleSize }));

    fc.assert(
      fc.property(genRunParams, (runParams) => {
        const gen = makeGen(min, max);

        const xs = runSucceedingGen(gen, runParams).map(getOrder);

        const { pValue } = analyzeUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.01);
      }),
      {
        numRuns: 1,
      },
    );
  },
);
