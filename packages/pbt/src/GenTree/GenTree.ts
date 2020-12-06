import { pipe, concat as concatIter, first as firstIter } from 'ix/iterable';
import {
  map as mapIter,
  flatMap as flatMapIter,
  filter as filterIter,
  skip as skipIter,
  take as takeIter,
  scan as scanIter,
} from 'ix/iterable/operators';
import { NodeId } from './NodeId';
import { NodeIdSet } from './NodeIdSet';

export type GenTree<Value> = {
  node: GenTree.Node<Value>;
  shrinks: Iterable<GenTree<Value>>;
};

export namespace GenTree {
  export type Complexity = number;

  export type Node<Value> = {
    id: NodeId;
    value: Value;
    complexity: Complexity;
  };

  export type CalculateComplexity<T> = (value: T) => Complexity;

  export namespace CalculateComplexity {
    export const none = <T>(): CalculateComplexity<T> => () => 0;
  }

  export const create = <Value>(node: Node<Value>, shrinks: Iterable<GenTree<Value>>): GenTree<Value> => ({
    node,
    shrinks,
  });

  export const singleton = <Value>(value: Value): GenTree<Value> =>
    create({ id: NodeId.EMPTY, value, complexity: 0 }, []);

  export const traverse = function* <Value>(tree: GenTree<Value>): Iterable<Node<Value>> {
    yield tree.node;
    yield* pipe(tree.shrinks, flatMapIter(traverse));
  };

  export const traverseGreedy = <Value>(tree: GenTree<Value>, limit: number = 100): Node<Value>[] =>
    Array.from(pipe(traverse(tree), takeIter(limit)));

  export const unfold = <Value, Accumulator>(
    acc: Accumulator,
    map: (acc: Accumulator) => Value,
    shrink: (acc: Accumulator) => Iterable<Accumulator>,
    measure: (value: Accumulator) => Complexity,
  ): GenTree<Value> => unfoldInternal(acc, map, shrink, measure, (acc0) => JSON.stringify(acc0), NodeIdSet.create());

  const unfoldInternal = <Value, Accumulator>(
    acc: Accumulator,
    map: (acc: Accumulator) => Value,
    shrink: (acc: Accumulator) => Iterable<Accumulator>,
    measure: (acc: Accumulator) => Complexity,
    identify: (acc: Accumulator) => string,
    encountered: NodeIdSet,
  ): GenTree<Value> => {
    const value = map(acc);
    const complexity = measure(acc);
    const id = NodeId.create(identify(acc));
    return create({ id, value, complexity }, unfoldForestInternal(acc, map, shrink, measure, identify, encountered));
  };

  const unfoldForestInternal = <Value, Accumulator>(
    acc: Accumulator,
    map: (acc: Accumulator) => Value,
    shrink: (acc: Accumulator) => Iterable<Accumulator>,
    measure: (acc: Accumulator) => Complexity,
    identify: (acc: Accumulator) => string,
    encountered: NodeIdSet,
  ): Iterable<GenTree<Value>> => {
    type UnfoldForestState = {
      acc0: Accumulator | undefined;
      encountered0: NodeIdSet;
    };

    return pipe(
      shrink(acc),
      scanIter<Accumulator, UnfoldForestState>({
        seed: {
          acc0: undefined,
          encountered0: encountered,
        },
        callback: ({ encountered0 }, acc0) => {
          const id = NodeId.create(identify(acc0));
          const hasBeenEncountered = encountered0.has(id);
          return hasBeenEncountered ? { acc0: undefined, encountered0 } : { acc0, encountered0: encountered0.add(id) };
        },
      }),
      mapIter(({ acc0, encountered0 }): GenTree<Value> | undefined =>
        acc0 === undefined ? undefined : unfoldInternal(acc0, map, shrink, measure, identify, encountered0),
      ),
      filterIter(isNotUndefined),
    );
  };

  /* istanbul ignore next */
  export const fold = <Value, FoldedTree, FoldedForest>(
    tree: GenTree<Value>,
    treeFolder: (node: Node<Value>, foldedForest: FoldedForest) => FoldedTree,
    forestFolder: (forest: Iterable<FoldedTree>) => FoldedForest,
  ): FoldedTree => treeFolder(tree.node, foldForest(tree.shrinks, treeFolder, forestFolder));

  /* istanbul ignore next */
  export const foldForest = <Value, FoldedTree, FoldedForest>(
    forest: Iterable<GenTree<Value>>,
    treeFolder: (node: Node<Value>, foldedForest: FoldedForest) => FoldedTree,
    forestFolder: (forest: Iterable<FoldedTree>) => FoldedForest,
  ): FoldedForest =>
    forestFolder(
      pipe(
        forest,
        mapIter((x) => fold(x, treeFolder, forestFolder)),
      ),
    );

  export const mapNode = <SourceValue, DestinationValue>(
    tree: GenTree<SourceValue>,
    f: (value: Node<SourceValue>) => Node<DestinationValue>,
  ): GenTree<DestinationValue> =>
    create(
      f(tree.node),
      pipe(
        tree.shrinks,
        mapIter((shrink) => mapNode(shrink, f)),
      ),
    );

  export const map = <SourceValue, DestinationValue>(
    tree: GenTree<SourceValue>,
    f: (value: SourceValue) => DestinationValue,
  ): GenTree<DestinationValue> =>
    create(
      {
        id: tree.node.id,
        value: f(tree.node.value),
        complexity: tree.node.complexity,
      },
      pipe(
        tree.shrinks,
        mapIter((shrink) => map(shrink, f)),
      ),
    );

  export const filterForest = <T>(forest: Iterable<GenTree<T>>, pred: (x: T) => boolean): Iterable<GenTree<T>> => {
    return pipe(
      forest,
      filterIter((shrink) => pred(shrink.node.value)),
      mapIter((shrink) => create(shrink.node, filterForest(shrink.shrinks, pred))),
    );
  };

  export const concat = <Value>(
    forest: GenTree<Value>[],
    cost: (length: number) => Complexity,
    shrink: (arr: GenTree<Value>[]) => Iterable<GenTree<Value>[]>,
  ): GenTree<Value[]> =>
    merge<Value, Value[]>(
      forest,
      (values) => values,
      (nodes) => {
        const mergeComplexity = cost(nodes.length);
        return nodes.map((node) => node.complexity).reduce((acc, curr) => acc + curr, mergeComplexity);
      },
      shrink,
      NodeIdSet.create(),
    )!;

  const merge = <ElementValue, MergedValue>(
    forest: GenTree<ElementValue>[],
    map: (values: ElementValue[]) => MergedValue,
    measure: (nodes: Node<ElementValue>[]) => Complexity,
    shrink: (arr: GenTree<ElementValue>[]) => Iterable<GenTree<ElementValue>[]>,
    encountered: NodeIdSet,
  ): GenTree<MergedValue> | undefined => {
    const node = mergeNode(
      forest.map((tree) => tree.node),
      map,
      measure,
    );

    const treeCullingShrinks = shrink(forest);

    const treeMergingShrinks = pipe(
      forest.map((tree) => tree.shrinks),
      mapIter((shrinks, index) => insertShrinksIntoForest(forest, shrinks, index)),
      flatMapIter((x) => x),
    );

    type MergeForestState = {
      forest0: GenTree<ElementValue>[] | undefined;
      encountered0: NodeIdSet;
    };

    const shrinks = pipe(
      concatIter(treeCullingShrinks, treeMergingShrinks),
      scanIter<GenTree<ElementValue>[], MergeForestState>({
        seed: {
          forest0: undefined,
          encountered0: encountered,
        },
        callback: ({ encountered0 }, forest0) => {
          const id = NodeId.concat(forest0.map((tree) => tree.node.id));
          const hasBeenEncountered = encountered0.has(id);
          return hasBeenEncountered
            ? { forest0: undefined, encountered0 }
            : { forest0, encountered0: encountered0.add(id) };
        },
      }),
      mapIter(({ forest0, encountered0 }): GenTree<MergedValue> | undefined =>
        forest0 === undefined ? undefined : merge(forest0, map, measure, shrink, encountered0),
      ),
      filterIter(isNotUndefined),
    );

    return create(node, shrinks);
  };

  const mergeNode = <ElementValue, MergedValue>(
    elementNodes: Node<ElementValue>[],
    map: (values: ElementValue[]) => MergedValue,
    measure: (nodes: Node<ElementValue>[]) => Complexity,
  ): Node<MergedValue> => ({
    id: NodeId.concat(elementNodes.map((node) => node.id)),
    value: map(elementNodes.map((node) => node.value)),
    complexity: measure(elementNodes),
  });

  /**
   * Within a forest, replaces the tree at the index with shrinks. Shrinks are substituted individually, resulting in
   * a distinct forest being returned for each shrink given.
   */
  const insertShrinksIntoForest = <ElementValue>(
    forest: GenTree<ElementValue>[],
    shrinks: Iterable<GenTree<ElementValue>>,
    index: number,
  ): Iterable<GenTree<ElementValue>[]> => {
    const leftForest = forest.slice(0, index);
    const rightForest = forest.slice(index + 1);
    return pipe(
      shrinks,
      mapIter((tree) => [...leftForest, tree, ...rightForest]),
    );
  };

  export const navigate = <Value>(tree: GenTree<Value>, path: number[]): GenTree<Value> | null => {
    if (path.length === 0) return tree;

    const [x, ...xs] = path;
    const nextTree = firstIter(pipe(tree.shrinks, skipIter(x - 1)));

    /* istanbul ignore next */
    if (!nextTree) {
      return null;
    }

    return navigate(nextTree, xs);
  };

  export type FormatConfig<Value> = {
    formatValue?: (value: Value) => string;
    maxNodes: number;
    indentation: string;
  };

  /* istanbul ignore next */
  const formatLines = <Value>(
    tree: GenTree<Value>,
    nestCount: number,
    config: FormatConfig<Value>,
  ): Iterable<string> => {
    const valueFormatted = config.formatValue ? config.formatValue(tree.node.value) : tree.node.value;
    const nodeFormatted = `${config.indentation.repeat(nestCount * 2)}${valueFormatted} (c = ${tree.node.complexity})`;

    const shrinksFormatted = pipe(
      tree.shrinks,
      flatMapIter((i) => formatLines(i, nestCount + 1, config)),
    );

    return concatIter([nodeFormatted], shrinksFormatted);
  };

  export const format = <Value>(tree: GenTree<Value>, config: Partial<FormatConfig<Value>> = {}): string =>
    Array.from(
      pipe(formatLines(tree, 0, { maxNodes: 100, indentation: '.', ...config }), takeIter(config.maxNodes || 100)),
    ).join('\n');
}

const isNotUndefined = <T>(x: T | undefined): x is T => x !== undefined;
