import fc from 'fast-check';
import { take } from 'ix/iterable/operators';
import * as dev from '../../src/Gen';
import * as devCore from '../../src/Core';
import * as domainGen from './Helpers/domainGen';
import { iterateOutcomes, iterateTrees } from './Helpers/genRunner';

test('It has an isomorphism with Array.prototype.map', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.firstOrderGen(),
      domainGen.func(fc.anything(), { arity: 1 }),
      (runParams, unmappedGen, f) => {
        const mappedGen = dev.operators.map(unmappedGen, f);

        const mappedOutcomesByGen = iterateOutcomes(mappedGen, runParams);
        const mappedOutcomesByArray = iterateOutcomes(unmappedGen, runParams).map(f);

        expect(mappedOutcomesByGen).toEqual(mappedOutcomesByArray);
      },
    ),
  );
});

test('It also applies the mapping to the shrinks', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.firstOrderGen(),
      fc.anything(),
      (runParams, unmappedGen, mappedSymbol) => {
        const mappedGen = dev.operators.map(unmappedGen, () => mappedSymbol);

        const mappedTrees = iterateTrees(mappedGen, runParams);

        for (const tree of mappedTrees) {
          for (const outcome of take(10)(devCore.Tree.traverse(tree))) {
            expect(outcome).toEqual(mappedSymbol);
          }
        }
      },
    ),
  );
});
