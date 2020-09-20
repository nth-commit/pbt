import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens_ThatHaveAUniformDistribution } from './Gen.Spec';
import { runSucceedingGen } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';
import { analyzeUniformDistribution } from './Helpers/statistics';

type GenUniformDistributionFixture<T> = {
  getSample: (instance: T) => number;
  min: number;
  max: number;
  gen: dev.Gen<T>;
  size?: dev.Size;
};

const id = <T>(x: T) => x;

const makeNumericUniformDistributionFixture = (
  makeGen: (min: number, max: number) => dev.Gen<number>,
  size?: dev.Size,
): GenUniformDistributionFixture<number> => {
  const min = 0;
  const max = 100;
  return {
    getSample: id,
    min,
    max,
    gen: makeGen(min, max),
    size,
  };
};

const uniformDistributionFixtures: Record<Gens_ThatHaveAUniformDistribution, GenUniformDistributionFixture<any>> = {
  'integer.unscaled': makeNumericUniformDistributionFixture(dev.integer.unscaled),
  'integer.scaleLinearly': makeNumericUniformDistributionFixture(dev.integer.scaleLinearly, 100),
};

test.each(Object.keys(uniformDistributionFixtures))('It is uniformly distributed (%s)', (genLabel: string) => {
  const { getSample, gen, min, max, size } = uniformDistributionFixtures[genLabel as Gens_ThatHaveAUniformDistribution];
  const sampleSize = 1000;

  const genRunParams = domainGen
    .runParams()
    .map((runParams) => ({ ...runParams, size: size || runParams.size, iterations: sampleSize }));

  fc.assert(
    fc.property(genRunParams, (runParams) => {
      const xs = runSucceedingGen(gen, runParams).map(getSample);

      const { pValue } = analyzeUniformDistribution(min, max, xs);
      expect(pValue).toBeGreaterThanOrEqual(0.01);
    }),
    {
      numRuns: 1,
    },
  );
});
