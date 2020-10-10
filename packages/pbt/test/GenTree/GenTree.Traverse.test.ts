import { GenTree, GenTreeNode } from '../../src/GenTree';

const makeNode = (valueAndComplexity: number): GenTreeNode<number> => ({
  value: valueAndComplexity,
  complexity: valueAndComplexity,
});
const node0 = makeNode(0);
const node1 = makeNode(1);
const node2 = makeNode(2);

test('It traverses depth', () => {
  const tree: GenTree<number> = {
    node: node0,
    shrinks: [
      {
        node: node1,
        shrinks: [
          {
            node: node2,
            shrinks: [],
          },
        ],
      },
    ],
  };

  const nodes = Array.from(GenTree.traverse(tree));

  expect(nodes).toEqual([node0, node1, node2]);
});

test('It traverses breadth', () => {
  const tree: GenTree<number> = {
    node: node0,
    shrinks: [
      {
        node: node1,
        shrinks: [],
      },
      {
        node: node2,
        shrinks: [],
      },
    ],
  };

  const nodes = Array.from(GenTree.traverse(tree));

  expect(nodes).toEqual([node0, node1, node2]);
});
