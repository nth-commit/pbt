import { pipe } from 'ix/iterable';
import { filter as filterIterable, map as mapIterable } from 'ix/iterable/operators';

export type Tree<T> = [T, Iterable<Tree<T>>];

export namespace Tree {
  export const create = <T>(x: T, xs: Iterable<Tree<T>>): Tree<T> => [x, xs];

  export const map = <T, U>([outcome, shrinks]: Tree<T>, f: (x: T) => U): Tree<U> => {
    return create(
      f(outcome),
      pipe(
        shrinks,
        mapIterable((tree) => map(tree, f)),
      ),
    );
  };

  export function unfold<Seedling, Node>(
    f: (x: Seedling) => Node,
    g: (x: Seedling) => Iterable<Seedling>,
    x: Seedling,
  ): Tree<Node> {
    return create(f(x), unfoldForest(f, g, x));
  }

  export function unfoldForest<Seedling, Node>(
    f: (x: Seedling) => Node,
    g: (x: Seedling) => Iterable<Seedling>,
    x: Seedling,
  ): Iterable<Tree<Node>> {
    return pipe(
      g(x),
      mapIterable((y) => unfold(f, g, y)),
    );
  }

  export function fold<Node, FoldedTree, FoldedForest>(
    [x, xs]: Tree<Node>,
    treeFolder: (x: Node, foldedForest: FoldedForest) => FoldedTree,
    forestFolder: (xs: Iterable<FoldedTree>) => FoldedForest,
  ): FoldedTree {
    return treeFolder(x, foldForest(xs, treeFolder, forestFolder));
  }

  export function foldForest<Node, FoldedTree, FoldedForest>(
    xs: Iterable<Tree<Node>>,
    treeFolder: (x: Node, foldedForest: FoldedForest) => FoldedTree,
    forestFolder: (xs: Iterable<FoldedTree>) => FoldedForest,
  ): FoldedForest {
    return forestFolder(
      pipe(
        xs,
        mapIterable((x) => fold(x, treeFolder, forestFolder)),
      ),
    );
  }

  export function filterForest<T, U extends T>(forest: Iterable<Tree<T>>, pred: (x: T) => x is U): Iterable<Tree<U>>;
  export function filterForest<T>(forest: Iterable<Tree<T>>, pred: (x: T) => boolean): Iterable<Tree<T>>;
  export function filterForest<T>(forest: Iterable<Tree<T>>, pred: (x: T) => boolean): Iterable<Tree<T>> {
    return pipe(
      forest,
      filterIterable(([x]) => pred(x)),
      mapIterable(([x, xs]) => [x, filterForest(xs, pred)]),
    );
  }
}
