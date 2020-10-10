import fc from 'fast-check';
import { count } from 'ix/iterable';
import * as domainGen from './Helpers/domainGen';
import { GenTree, GenTreeNode } from '../../src/GenTree';
import { Shrink } from '../../src/Gen';

test('GenTree.concat([], concatComplexity, <shrink>) => the root node contains the concatComplexity', () => {
  fc.assert(
    fc.property(domainGen.naturalNumber(), (concatComplexity) => {
      const genTreeConcat = GenTree.concat<unknown>([], () => concatComplexity, Shrink.none());

      const expectedNode: GenTreeNode<unknown[]> = {
        value: [],
        complexity: concatComplexity,
      };
      expect(genTreeConcat.node).toEqual(expectedNode);
    }),
  );
});

test('GenTree.concat([tree], <calculateComplexity>, <shrink>) => the root node contains the root node of tree', () => {
  fc.assert(
    fc.property(domainGen.anyTree(), domainGen.naturalNumber(), (tree, concatComplexity) => {
      const treeConcat = GenTree.concat([tree], () => concatComplexity, Shrink.none());

      const expectedNode: GenTreeNode<unknown[]> = {
        value: [tree.node.value],
        complexity: tree.node.complexity + concatComplexity,
      };
      expect(treeConcat.node).toEqual(expectedNode);
    }),
  );
});

test('GenTree.concat([tree1, tree2], <calculateComplexity>, <shrink>) => the root node contains the root nodes of [tree1, tree2]', () => {
  fc.assert(
    fc.property(
      domainGen.anyTree(),
      domainGen.anyTree(),
      domainGen.naturalNumber(),
      (tree1, tree2, concatComplexity) => {
        const treeConcat = GenTree.concat([tree1, tree2], () => concatComplexity, Shrink.none());

        const expectedNode: GenTreeNode<unknown[]> = {
          value: [tree1.node.value, tree2.node.value],
          complexity: tree1.node.complexity + tree2.node.complexity + concatComplexity,
        };
        expect(treeConcat.node).toEqual(expectedNode);
      },
    ),
  );
});

test('GenTree.concat(trees, <calculateComplexity>, <shrink>) => the root tree contains all the shrinks of each tree', () => {
  fc.assert(
    fc.property(
      domainGen.array(domainGen.anyTree()),
      domainGen.func(domainGen.naturalNumber()),
      (trees, calculateComplexity) => {
        const treeConcat = GenTree.concat(trees, calculateComplexity, Shrink.none());

        expect(count(treeConcat.shrinks)).toEqual(
          trees.reduce((accShrinkCount, tree) => accShrinkCount + count(tree.shrinks), 0),
        );
      },
    ),
  );
});
