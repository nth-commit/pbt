import fc from 'fast-check';
import { GenTree } from '../../src/GenTree';
import * as domainGen from './Helpers/domainGen';

test('It has an isomorphism with Array.prototype.map', () => {
  fc.assert(
    fc.property(domainGen.anyTree(), domainGen.anyFunc({ arity: 1 }), (tree, f) => {
      const mappedTree = GenTree.map(tree, f);

      const nodesMappedByTree = Array.from(GenTree.traverse(mappedTree));
      const nodesMappedByArray = Array.from(GenTree.traverse(tree)).map((node) => ({ ...node, value: f(node.value) }));

      expect(nodesMappedByTree).toEqual(nodesMappedByArray);
    }),
  );
});
