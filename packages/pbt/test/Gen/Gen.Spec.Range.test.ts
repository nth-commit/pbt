import fc from 'fast-check';
import * as devCore from '../../src/Core';
import * as dev from '../../src/Gen';
import { Gens_Ranged, Gens_Ranged_Constant, Gens_Ranged_Linear } from './Gen.Spec';
import { iterateAsOutcomes, iterateTrees } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';
import { analyzeUniformDistribution } from './Helpers/statistics';
import { take } from 'ix/iterable/operators';

type GenFactory<T> = (min: number, max: number) => dev.Gen<T>;

type MetaGen<T> = fc.Arbitrary<{
  min: number;
  max: number;
  gen: dev.Gen<T>;
}>;

type RangeFixture<T> = {
  getOrder: (x: T) => number;
  genFactory: GenFactory<T>;
  metaGen: MetaGen<T>;
};

const id = <T>(x: T) => x;

const createIntegerRangeFixture = (genFactory: (min: number, max: number) => dev.Gen<number>): RangeFixture<number> => {
  return {
    getOrder: id,
    genFactory,
    metaGen: fc.tuple(domainGen.integer(-1000, 1000), domainGen.naturalNumber()).map(([min, width]) => {
      const max = min + width;
      return {
        gen: genFactory(min, max),
        min,
        max,
      };
    }),
  };
};

const createNaturalNumberRangeFixture = (genFactory: (max: number) => dev.Gen<number>): RangeFixture<number> => {
  return {
    getOrder: id,
    genFactory: (min, max) => {
      if (min !== 0 || max < 0) throw new Error('Fatal: Unsupported gen params for naturalNumber');
      return genFactory(max);
    },
    metaGen: domainGen.naturalNumber().map((max) => {
      const min = 0;
      return {
        gen: genFactory(max),
        min,
        max,
      };
    }),
  };
};

const createArrayRangeFixture = (
  genFactory: (min: number, max: number, elementGen: dev.Gen<unknown>) => dev.Gen<unknown[]>,
): RangeFixture<unknown[]> => {
  return {
    getOrder: (xs) => xs.length,
    genFactory: (min, max) => genFactory(min, max, dev.constant({})),
    metaGen: fc.tuple(domainGen.naturalNumber(10), domainGen.naturalNumber(10)).map(([min, width]) => {
      const max = min + width;
      return {
        gen: genFactory(min, max, dev.constant({})),
        min,
        max,
      };
    }),
  };
};

const rangeFixtures: Record<Gens_Ranged, RangeFixture<any>> = {
  'integer.unscaled': createIntegerRangeFixture(dev.integer.unscaled),
  'integer.scaleLinearly': createIntegerRangeFixture(dev.integer.scaleLinearly),
  'naturalNumber.unscaled': createNaturalNumberRangeFixture(dev.naturalNumber.unscaled),
  'naturalNumber.scaleLinearly': createNaturalNumberRangeFixture(dev.naturalNumber.scaleLinearly),
  'array.unscaled': createArrayRangeFixture(dev.array.unscaled),
  'array.scaleLinearly': createArrayRangeFixture(dev.array.scaleLinearly),
};

const constantRangeFixtures: Record<Gens_Ranged_Constant, RangeFixture<any>> = {
  'integer.unscaled': rangeFixtures['integer.unscaled'],
  'naturalNumber.unscaled': rangeFixtures['naturalNumber.unscaled'],
  'array.unscaled': rangeFixtures['array.unscaled'],
};

const linearRangeFixtures: Record<Gens_Ranged_Linear, RangeFixture<any>> = {
  'integer.scaleLinearly': rangeFixtures['integer.scaleLinearly'],
  'naturalNumber.scaleLinearly': rangeFixtures['naturalNumber.scaleLinearly'],
  'array.scaleLinearly': rangeFixtures['array.scaleLinearly'],
};

test.each(Object.keys(rangeFixtures))('It is generates instances that are in range (%s)', (genLabel: string) => {
  const { getOrder, metaGen } = rangeFixtures[genLabel as Gens_Ranged];

  fc.assert(
    fc.property(domainGen.runParams(), metaGen, (runParams, { gen, min, max }) => {
      const xs = iterateAsOutcomes(gen, runParams).map(getOrder);

      xs.forEach((x) => {
        expect(x).toBeGreaterThanOrEqual(min);
        expect(x).toBeLessThanOrEqual(max);
      });
    }),
  );
});

test.each(Object.keys(rangeFixtures))('It is also generates shrinks in range (%s)', (genLabel: string) => {
  const { getOrder, metaGen } = rangeFixtures[genLabel as Gens_Ranged];

  fc.assert(
    fc.property(domainGen.runParams(), metaGen, (runParams, { gen, min, max }) => {
      const trees = iterateTrees(gen, runParams).map((tree) => devCore.Tree.map(tree, getOrder));

      for (const tree of trees) {
        for (const x of take(10)(devCore.Tree.traverse(tree))) {
          expect(x).toBeGreaterThanOrEqual(min);
          expect(x).toBeLessThanOrEqual(max);
        }
      }
    }),
  );
});

test.each(Object.keys(constantRangeFixtures))(
  'For constant ranges, it generates instances with a uniformly distributed order (%s)',
  (genLabel: string) => {
    const { getOrder, genFactory } = rangeFixtures[genLabel as Gens_Ranged];

    const min = 0;
    const max = 10;
    const sampleSize = 1000;

    const genRunParams = domainGen.runParams().map((runParams) => ({ ...runParams, iterations: sampleSize }));

    fc.assert(
      fc.property(genRunParams, (runParams) => {
        const gen = genFactory(min, max);

        const xs = iterateAsOutcomes(gen, runParams).map(getOrder);

        const { pValue } = analyzeUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.001);
      }),
      { numRuns: 1 },
    );
  },
);

test.each(Object.keys(linearRangeFixtures))(
  'For linear ranges, when size = 0, it generates instances with an order equal to the min (%s)',
  (genLabel: string) => {
    const { getOrder, metaGen } = rangeFixtures[genLabel as Gens_Ranged];

    const genRunParams = domainGen.runParams().map<domainGen.GenRunParams>((runParams) => ({ ...runParams, size: 0 }));

    fc.assert(
      fc.property(genRunParams, metaGen, (runParams, { gen, min }) => {
        const xs = iterateAsOutcomes(gen, runParams).map(getOrder);

        xs.forEach((x) => {
          expect(x).toEqual(min);
        });
      }),
    );
  },
);

test.each(Object.keys(linearRangeFixtures))(
  'For linear ranges, when size = 50, it generates numbers in approximately the lower half of the range (%s)',
  (genLabel: string) => {
    const { getOrder, metaGen } = rangeFixtures[genLabel as Gens_Ranged];

    const genRunParams = domainGen.runParams().map<domainGen.GenRunParams>((runParams) => ({ ...runParams, size: 50 }));

    fc.assert(
      fc.property(genRunParams, metaGen, (runParams, { gen, min, max }) => {
        const rangeSize = max - min;
        const halfMax = min + Math.ceil(rangeSize / 2);

        const xs = iterateAsOutcomes(gen, runParams).map(getOrder);

        xs.forEach((x) => {
          expect(x).toBeLessThanOrEqual(halfMax);
        });
      }),
    );
  },
);

test.each(Object.keys(linearRangeFixtures))(
  'For linear ranges, when size = 100, it generates instances with a uniformly distributed order (%s)',
  (genLabel: string) => {
    const { getOrder, genFactory } = rangeFixtures[genLabel as Gens_Ranged];

    const min = 0;
    const max = 1000;
    const sampleSize = 1000;

    const genRunParams = domainGen
      .runParams()
      .map((runParams) => ({ ...runParams, size: 100, iterations: sampleSize }));

    fc.assert(
      fc.property(genRunParams, (runParams) => {
        const gen = genFactory(min, max);

        const xs = iterateAsOutcomes(gen, runParams).map(getOrder);

        const { pValue } = analyzeUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.001);
      }),
      {
        numRuns: 1,
      },
    );
  },
);
