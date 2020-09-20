import fc from 'fast-check';
import * as dev from '../../src/Gen';
import { Gens } from './Gen.Spec';
import { runGen } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

const gens: { [P in Gens]: fc.Arbitrary<dev.Gen<unknown>> } = {
  'integer.unscaled': fc.tuple(domainGen.integer(), domainGen.integer()).map((args) => dev.integer.unscaled(...args)),
  'integer.scaleLinearly': fc
    .tuple(domainGen.integer(), domainGen.integer())
    .map((args) => dev.integer.scaleLinearly(...args)),
  'naturalNumber.unscaled': fc.constant(dev.naturalNumber.unscaled()),
  'naturalNumber.scaleLinearly': fc.constant(dev.naturalNumber.scaleLinearly()),
};

test.each(Object.keys(gens))('It is repeatable (%s)', (genLabel: string) => {
  const metaGen = gens[genLabel as Gens];

  fc.assert(
    fc.property(domainGen.runParams(), metaGen, (runParams, gen) => {
      const genIterations1 = runGen(gen, runParams);
      const genIterations2 = runGen(gen, runParams);

      const normalizeForComparison = <T>(iteration: dev.GenIteration<T>) =>
        iteration.kind === 'instance' ? { outcome: iteration.tree[0] } : iteration;

      expect(genIterations1.map(normalizeForComparison)).toEqual(genIterations2.map(normalizeForComparison));
    }),
  );
});
