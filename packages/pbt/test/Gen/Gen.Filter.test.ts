import fc from 'fast-check';
import { take } from 'ix/iterable/operators';
import * as dev from '../../src/Gen';
import * as devCore from '../../src/Core';
import * as domainGen from './Helpers/domainGen';
import { iterate, iterateOutcomes, iterateTrees } from './Helpers/genRunner';

test('When given a true predicate, it returns a gen which is equivalent to the base gen', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, unfilteredGen) => {
      const filteredGen = dev.operators.filter(unfilteredGen, () => true);

      const filteredGenIterations = iterate(filteredGen, runParams);
      const unfilteredGenIterations = iterate(unfilteredGen, runParams);

      const normalizeForComparison = <T>(iteration: dev.GenIteration<T>) =>
        iteration.kind === 'instance' ? { outcome: iteration.tree[0] } : iteration;

      expect(filteredGenIterations.map(normalizeForComparison)).toEqual(
        unfilteredGenIterations.map(normalizeForComparison),
      );
    }),
  );
});

test('When given a false predicate, it returns a gen which only generates discards', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, unfilteredGen) => {
      const filteredGen = dev.operators.filter(unfilteredGen, () => false);

      const filteredGenIterations = iterate(filteredGen, runParams);
      const unfilteredGenIterations = iterate(unfilteredGen, runParams);

      filteredGenIterations.forEach((genIteration, i) => {
        expect(genIteration.kind).toEqual('discard');
        expect((genIteration as dev.GenIteration.Discard).value).toEqual(
          (unfilteredGenIterations[i] as dev.GenIteration.Instance<unknown>).tree[0],
        );
      });
    }),
  );
});

test('It has an isomorphism with Array.prototype.filter', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.firstOrderGen(),
      domainGen.predicate({ arity: 1 }),
      (runParams, unfilteredGen, predicate) => {
        const filteredGen = dev.operators.filter(unfilteredGen, predicate);

        const filteredOutcomesByGen = iterateOutcomes(filteredGen, runParams);
        const filteredOutcomesByArray = iterateOutcomes(unfilteredGen, runParams).filter(predicate);

        expect(filteredOutcomesByGen).toEqual(filteredOutcomesByArray);
      },
    ),
  );
});

test('It also applies the filter to the shrinks', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.firstOrderGen(),
      domainGen.predicate({ arity: 1 }),
      (runParams, unfilteredGen, predicate) => {
        const filteredGen = dev.operators.filter(unfilteredGen, predicate);

        const filteredTrees = iterateTrees(filteredGen, runParams);

        for (const tree of filteredTrees) {
          for (const outcome of take(10)(devCore.Tree.traverse(tree))) {
            expect(predicate(outcome)).toEqual(true);
          }
        }
      },
    ),
  );
});
