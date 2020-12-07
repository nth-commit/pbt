import { pipe, isEmpty, toArray } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as dev from '../../src';

type LocatedGenTreeNode<T> = { path: number[]; node: dev.GenTree.Node<T> };

const traverseBreadthFirst = function* <T>(tree: dev.GenTree<T>): Iterable<LocatedGenTreeNode<T>> {
  let nextTraversals: Array<[LocatedGenTreeNode<T>, Iterable<dev.GenTree<T>>]> = [
    [{ path: [], node: tree.node }, tree.shrinks],
  ];

  while (!isEmpty(nextTraversals)) {
    const currentTraversals = nextTraversals;

    nextTraversals = [];
    for (let i = 0; i < currentTraversals.length; i++) {
      const [parent, shrinksLazy] = currentTraversals[i];

      const shrinks = Array.from(shrinksLazy);
      for (let j = 0; j < shrinks.length; j++) {
        const shrink = shrinks[j];

        const current = { path: [...parent.path, j], node: shrink.node };
        nextTraversals.push([current, shrink.shrinks]);
        yield current;
      }
    }
  }
};

const unfoldLocatedNodes = <T>(
  rootNode: dev.GenTree.Node<T>,
  locatedNodes: LocatedGenTreeNode<T>[],
): dev.GenTree<T> => {
  const result: dev.GenTree<T> = {
    node: rootNode,
    shrinks: [],
  };

  for (const { path, node } of locatedNodes) {
    const pathToParent = path.slice(0, path.length - 1);
    const targetShrinks = pathToParent.reduce(
      (acc, curr) => (acc as dev.GenTree<T>[])[curr].shrinks,
      result.shrinks,
    ) as dev.GenTree<T>[];
    targetShrinks[path[path.length - 1]] = {
      node,
      shrinks: [],
    };
  }

  return result;
};

export const formatBreadthFirst = <Value>(
  tree: dev.GenTree<Value>,
  config: Partial<dev.GenTree.FormatConfig<Value>> = {},
): string => {
  const resolvedConfig: dev.GenTree.FormatConfig<Value> = { maxNodes: 100, indentation: '.', ...config };
  const locatedNodes = toArray(pipe(traverseBreadthFirst(tree), take(resolvedConfig.maxNodes)));
  const trimmedTree = unfoldLocatedNodes(tree.node, locatedNodes);
  return dev.GenTree.format(trimmedTree, resolvedConfig);
};
