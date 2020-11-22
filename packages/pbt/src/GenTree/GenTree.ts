import { pipe, concat as concatIter, first as firstIter } from 'ix/iterable';
import {
  map as mapIter,
  flatMap as flatMapIter,
  filter as filterIter,
  skip as skipIter,
  take as takeIter,
} from 'ix/iterable/operators';

export type GenTree<Value> = {
  node: GenTree.Node<Value>;
  shrinks: Iterable<GenTree<Value>>;
};

export namespace GenTree {
  export type Complexity = number;

  export type Node<Value> = {
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

  export const traverse = function* <Value>(tree: GenTree<Value>): Iterable<Node<Value>> {
    yield tree.node;
    yield* pipe(tree.shrinks, flatMapIter(traverse));
  };

  export const traverseGreedy = <Value>(tree: GenTree<Value>, limit: number = 100): Node<Value>[] =>
    Array.from(pipe(traverse(tree), takeIter(limit)));

  export const unfold = <Value, Accumulator>(
    acc: Accumulator,
    accToValue: (acc: Accumulator) => Value,
    accExpander: (acc: Accumulator) => Iterable<Accumulator>,
    calculateComplexity: (value: Accumulator) => Complexity,
  ): GenTree<Value> => {
    const value = accToValue(acc);
    const complexity = calculateComplexity(acc);
    return create({ value, complexity }, unfoldForest(acc, accToValue, accExpander, calculateComplexity));
  };

  export const unfoldForest = <Value, Accumulator>(
    acc: Accumulator,
    accToValue: (acc: Accumulator) => Value,
    accExpander: (acc: Accumulator) => Iterable<Accumulator>,
    calculateComplexity: (value: Accumulator) => Complexity,
  ): Iterable<GenTree<Value>> =>
    pipe(
      accExpander(acc),
      mapIter((acc0) => unfold(acc0, accToValue, accExpander, calculateComplexity)),
    );

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
        value: f(tree.node.value),
        complexity: tree.node.complexity,
      },
      pipe(
        tree.shrinks,
        mapIter((shrink) => map(shrink, f)),
      ),
    );

  export function filterForest<T>(forest: Iterable<GenTree<T>>, pred: (x: T) => boolean): Iterable<GenTree<T>> {
    return pipe(
      forest,
      filterIter((shrink) => pred(shrink.node.value)),
      mapIter((shrink) => create(shrink.node, filterForest(shrink.shrinks, pred))),
    );
  }

  export const merge = <ElementValue, MergedValue>(
    forest: GenTree<ElementValue>[],
    fMerge: (values: ElementValue[]) => MergedValue,
    fMergeComplexity: (nodes: Node<ElementValue>[]) => Complexity,
    shrinkArray: (arr: GenTree<ElementValue>[]) => Iterable<GenTree<ElementValue>[]>,
  ): GenTree<MergedValue> => {
    const node = mergeNode(
      forest.map((tree) => tree.node),
      fMerge,
      fMergeComplexity,
    );

    const treeCullingShrinks = shrinkArray(forest);

    const treeMergingShrinks = pipe(
      forest.map((tree) => tree.shrinks),
      mapIter((shrinks, index) => replaceTreeWithShrinks(forest, shrinks, index)),
      flatMapIter((x) => x),
    );

    return create(
      node,
      pipe(
        concatIter(treeCullingShrinks, treeMergingShrinks),
        mapIter((forest0) => merge(forest0, fMerge, fMergeComplexity, shrinkArray)),
      ),
    );
  };

  const mergeNode = <ElementValue, MergedValue>(
    elementNodes: Node<ElementValue>[],
    fMerge: (values: ElementValue[]) => MergedValue,
    fMergeComplexity: (nodes: Node<ElementValue>[]) => Complexity,
  ): Node<MergedValue> => ({
    value: fMerge(elementNodes.map((node) => node.value)),
    complexity: fMergeComplexity(elementNodes),
  });

  /**
   * Within a forest, replaces the tree at the index with shrinks. Shrinks are substituted individually, resulting in
   * a distinct forest being returned for each shrink given.
   */
  const replaceTreeWithShrinks = <ElementValue>(
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

  export const concat = <Value>(
    forest: GenTree<Value>[],
    calculateConcatComplexity: (length: number) => Complexity,
    shrinkArray: (arr: GenTree<Value>[]) => Iterable<GenTree<Value>[]>,
  ): GenTree<Value[]> =>
    merge<Value, Value[]>(
      forest,
      (values) => values,
      (nodes) => {
        const mergeComplexity = calculateConcatComplexity(nodes.length);
        return nodes.map((node) => node.complexity).reduce((acc, curr) => acc + curr, mergeComplexity);
      },
      shrinkArray,
    );

  export const navigate = <Value>(tree: GenTree<Value>, path: number[]): GenTree<Value> | null => {
    if (path.length === 0) return tree;

    const [x, ...xs] = path;
    const nextTree = firstIter(pipe(tree.shrinks, skipIter(x - 1)));

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
