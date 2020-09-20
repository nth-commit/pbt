import fc from 'fast-check';
import { repeatValue } from 'ix/iterable';
import * as dev from '../../src/Gen';
import { Gens_SecondOrder } from './Gen.Spec';
import { iterate } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

const gens: { [P in Gens_SecondOrder]: fc.Arbitrary<(gen: dev.Gen<unknown>) => dev.Gen<unknown>> } = {
  noShrink: fc.constant(dev.noShrink),
};

test.each(Object.keys(gens))('It discards when the input gen discards (%s)', (genLabel: string) => {
  const genSecondOrderGen = gens[genLabel as Gens_SecondOrder];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), genSecondOrderGen, (runParams, _, secondOrderGen) => {
      // TODO: Use false pred on an arbitrary gen
      const baseGen: dev.Gen<unknown> = () => repeatValue({ kind: 'discard', value: null });
      const gen = secondOrderGen(baseGen);

      const genIterations = iterate(gen, runParams);

      genIterations.forEach((genIteration) => {
        expect(genIteration.kind).toEqual('discard');
      });
    }),
  );
});

test.each(Object.keys(gens))('It exhausts when the input gen exhausts (%s)', (genLabel: string) => {
  const genSecondOrderGen = gens[genLabel as Gens_SecondOrder];

  fc.assert(
    fc.property(domainGen.runParams(), genSecondOrderGen, (runParams, secondOrderGen) => {
      const baseGen = dev.exhausted();
      const gen = secondOrderGen(baseGen);

      const genIterations = iterate(gen, runParams);

      expect(genIterations).toEqual([{ kind: 'exhausted' }]);
    }),
  );
});
