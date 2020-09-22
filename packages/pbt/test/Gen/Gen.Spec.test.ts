import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens } from './Gen.Spec';
import { iterate } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

const gens: { [P in Gens]: fc.Arbitrary<dev.Gen<unknown>> } = {
  'integer.unscaled': domainGen.defaultGens.integerUnscaled(),
  'integer.scaleLinearly': domainGen.defaultGens.integerScaledLinearly(),
  'naturalNumber.unscaled': domainGen.defaultGens.integerUnscaled(),
  'naturalNumber.scaleLinearly': domainGen.defaultGens.integerScaledLinearly(),
  'array.unscaled': domainGen.defaultGens.arrayUnscaled(),
  'array.scaleLinearly': domainGen.defaultGens.arrayScaledLinearly(),
  element: domainGen.defaultGens.element(),
  map: domainGen.defaultGens.map(),
  flatMap: domainGen.defaultGens.flatMap(),
  filter: domainGen.defaultGens.filter(),
  reduce: domainGen.defaultGens.reduce(),
  noShrink: domainGen.defaultGens.noShrink(),
  postShrink: domainGen.defaultGens.postShrink(),
};

test.each(Object.keys(gens))('It is repeatable (%s)', (genLabel: string) => {
  const metaGen = gens[genLabel as Gens];

  fc.assert(
    fc.property(domainGen.runParams(), metaGen, (runParams, gen) => {
      const genIterations1 = iterate(gen, runParams);
      const genIterations2 = iterate(gen, runParams);

      const normalizeForComparison = <T>(iteration: dev.GenIteration<T>) =>
        iteration.kind === 'instance' ? { outcome: iteration.tree[0] } : iteration;

      expect(genIterations1.map(normalizeForComparison)).toEqual(genIterations2.map(normalizeForComparison));
    }),
  );
});
