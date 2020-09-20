import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens_FirstOrder } from './Gen.Spec';
import { runGen } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

const gens: { [P in Gens_FirstOrder]: fc.Arbitrary<dev.Gen<unknown>> } = {
  'integer.unscaled': fc.tuple(domainGen.integer(), domainGen.integer()).map((args) => dev.integer.unscaled(...args)),
  'integer.scaleLinearly': fc
    .tuple(domainGen.integer(), domainGen.integer())
    .map((args) => dev.integer.scaleLinearly(...args)),
  'naturalNumber.unscaled': fc.constant(dev.naturalNumber.unscaled()),
  'naturalNumber.scaleLinearly': fc.constant(dev.naturalNumber.scaleLinearly()),
};

test.each(Object.keys(gens))('It exclusively generates instances (%s)', (genLabel: string) => {
  const metaGen = gens[genLabel as Gens_FirstOrder];

  fc.assert(
    fc.property(domainGen.runParams(), metaGen, (runParams, gen) => {
      const genIterations = runGen(gen, runParams);

      genIterations.forEach((genIteration) => {
        expect(genIteration.kind).toEqual('instance');
      });
    }),
  );
});
