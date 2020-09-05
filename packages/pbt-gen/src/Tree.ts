import { pipe } from 'ix/iterable';
import { map as mapIterable } from 'ix/iterable/operators';

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
}
