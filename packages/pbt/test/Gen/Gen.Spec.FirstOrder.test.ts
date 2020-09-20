import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens_FirstOrder } from './Gen.Spec';
import { iterate } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

const gens: { [P in Gens_FirstOrder]: fc.Arbitrary<dev.Gen<unknown>> } = {
  'integer.unscaled': domainGen.defaultGens.integerUnscaled(),
  'integer.scaleLinearly': domainGen.defaultGens.integerScaledLinearly(),
  'naturalNumber.unscaled': domainGen.defaultGens.integerUnscaled(),
  'naturalNumber.scaleLinearly': domainGen.defaultGens.integerScaledLinearly(),
};

test.each(Object.keys(gens))(
  'Under normal circumstances, It exclusively generates instances (%s)',
  (genLabel: string) => {
    const metaGen = gens[genLabel as Gens_FirstOrder];

    fc.assert(
      fc.property(domainGen.runParams(), metaGen, (runParams, gen) => {
        const genIterations = iterate(gen, runParams);

        genIterations.forEach((genIteration) => {
          expect(genIteration.kind).toEqual('instance');
        });
      }),
    );
  },
);
