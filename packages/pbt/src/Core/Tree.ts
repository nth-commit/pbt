import { concat, pipe, toArray } from 'ix/iterable';
import { filter as filterIterable, flatMap as flatMapIterable, map as mapIterable } from 'ix/iterable/operators';

export type Tree<T> = [outcome: T, shrinks: Iterable<Tree<T>>];

export namespace Tree {
  export const create = <T>(x: T, xs: Iterable<Tree<T>>): Tree<T> => [x, xs];

  export const outcome = <T>([x]: Tree<T>): T => x;

  export const shrinks = <T>([_, xs]: Tree<T>): Iterable<Tree<T>> => xs;

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

  export const combine = <T>(forest: Tree<T>[]): Tree<T[]> => {
    const combinedOutcome: T[] = forest.map(([outcome]) => outcome);

    const combinedShrinks: Iterable<Tree<T[]>> = pipe(
      forest,
      mapIterable(
        ([_, shrinks], i): Iterable<Tree<T[]>> => {
          const leftForest = forest.slice(0, i);
          const rightForest = forest.slice(i + 1);
          return pipe(
            shrinks,
            mapIterable((shrunkTree) => combine([...leftForest, shrunkTree, ...rightForest])),
          );
        },
      ),
      flatMapIterable((x) => x),
    );

    return [combinedOutcome, combinedShrinks];
  };

  export const expand = <T>([outcome, shrinks]: Tree<T>, f: (x: T) => Iterable<T>): Tree<T> => {
    const expandedOutcome = unfoldForest((x) => x, f, outcome);

    const expandedShrinks = pipe(
      shrinks,
      mapIterable((x) => expand(x, f)),
    );

    return Tree.create(outcome, concat(expandedShrinks, expandedOutcome));
  };

  /* istanbul ignore next */
  const formatInternal = ([outcome, shrinks]: Tree<string>, nestCount: number): string => {
    const valueFormatted = '-'.repeat(nestCount * 3) + outcome;

    const shrinksFormatted = toArray(
      pipe(
        shrinks,
        mapIterable((i) => formatInternal(i, nestCount + 1)),
      ),
    );

    return [valueFormatted, ...shrinksFormatted].join('\n');
  };

  /* istanbul ignore next */
  export const format = (tree: Tree<string>): string => formatInternal(tree, 0);

  export const traverse = function* <T>([outcome, shrinks]: Tree<T>): Iterable<T> {
    yield outcome;

    yield* pipe(
      shrinks,
      flatMapIterable((shrink) => traverse(shrink)),
    );
  };
}