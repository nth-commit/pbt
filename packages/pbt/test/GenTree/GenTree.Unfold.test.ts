import fc from 'fast-check';
import { pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as domainGen from './Helpers/domainGen';
import { GenTree } from '../../src';

const id = <T>(x: T): T => x;

test('GenTree.unfold(x, id, <accExpander>, <calculateComplexity>) => a tree with a root node of x', () => {
  fc.assert(
    fc.property(
      domainGen.anything(),
      domainGen.func(domainGen.anyShrinks()),
      domainGen.func(domainGen.naturalNumber()),
      (x, accExpander, calculateComplexity) => {
        const tree = GenTree.unfold(x, id, accExpander, calculateComplexity);

        expect(tree.node.value).toEqual(x);
      },
    ),
  );
});

test('GenTree.unfold(x, <accToValue>, <accExpander>, <calculateComplexity>) => a tree with a root node of accToValue(x)', () => {
  fc.assert(
    fc.property(
      domainGen.anything(),
      domainGen.anyFunc(),
      domainGen.func(domainGen.anyShrinks()),
      domainGen.func(domainGen.naturalNumber()),
      (x, accToValue, accExpander, calculateComplexity) => {
        const tree = GenTree.unfold(x, accToValue, accExpander, calculateComplexity);

        expect(tree.node.value).toEqual(accToValue(x));
      },
    ),
  );
});

test('GenTree.unfold(<acc>, <accToValue>, <accExpander>, <calculateComplexity>) => forall nodes, node.complexity = calculateComplexity(node.value)', () => {
  fc.assert(
    fc.property(
      domainGen.anything(),
      domainGen.func(domainGen.anything()),
      domainGen.func(domainGen.anyShrinks()),
      domainGen.func(domainGen.naturalNumber()),
      (acc, accToValue, accExpander, calculateComplexity) => {
        const tree = GenTree.unfold(acc, accToValue, accExpander, calculateComplexity);

        for (const node of pipe(GenTree.traverse(tree), take(10))) {
          expect(node.complexity).toEqual(calculateComplexity(node.value));
        }
      },
    ),
  );
});
