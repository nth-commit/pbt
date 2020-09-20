import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens_ThatAreRangeDependent } from './Gen.Spec';
import { runSucceedingGen } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

type RangeFixture<T> = {
  getOrder: (x: T) => number;
  metaGen: fc.Arbitrary<{
    min: number;
    max: number;
    gen: dev.Gen<T>;
  }>;
};

const id = <T>(x: T) => x;

const makeNumericRangeFixture = (makeGen: (min: number, max: number) => dev.Gen<number>): RangeFixture<number> => {
  return {
    getOrder: id,
    metaGen: fc.tuple(domainGen.integer(), domainGen.integer()).map(([a, b]) => {
      const min = a < b ? a : b;
      const max = a > b ? a : b;
      return {
        gen: makeGen(min, max),
        min,
        max,
      };
    }),
  };
};

const rangeFixtures: Record<Gens_ThatAreRangeDependent, RangeFixture<any>> = {
  'integer.unscaled': makeNumericRangeFixture(dev.integer.unscaled),
  'integer.scaleLinearly': makeNumericRangeFixture(dev.integer.scaleLinearly),
};

test.each(Object.keys(rangeFixtures))('It is generates instances in the range (%s)', (genLabel: string) => {
  const { getOrder, metaGen } = rangeFixtures[genLabel as Gens_ThatAreRangeDependent];

  fc.assert(
    fc.property(domainGen.runParams(), metaGen, (runParams, { gen, min, max }) => {
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
