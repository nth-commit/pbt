import { pipe, concat as concatIter } from 'ix/iterable';
import { map as mapIter, flatMap as flatMapIter } from 'ix/iterable/operators';

export type Complexity = number;

export type GenTreeNode<Value> = {
  value: Value;
  complexity: Complexity;
};

export type GenTree<Value> = {
  node: GenTreeNode<Value>;
  shrinks: Iterable<GenTree<Value>>;
};

export namespace GenTree {
  export const unfold = <Value, Accumulator>(
    acc: Accumulator,
    accToValue: (acc: Accumulator) => Value,
    accExpander: (acc: Accumulator) => Iterable<Accumulator>,
    calculateComplexity: (value: Accumulator) => Complexity,
  ): GenTree<Value> => {
    const value = accToValue(acc);
    const complexity = calculateComplexity(acc);
    return {
      node: { value, complexity },
      shrinks: unfoldForest(acc, accToValue, accExpander, calculateComplexity),
    };
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

  export const mapNodes = <SourceValue, DestinationValue>(
    tree: GenTree<SourceValue>,
    f: (node: GenTreeNode<SourceValue>) => GenTreeNode<DestinationValue>,
  ): GenTree<DestinationValue> => ({
    node: f(tree.node),
    shrinks: pipe(
      tree.shrinks,
      mapIter((shrink) => mapNodes(shrink, f)),
    ),
  });

  export const map = <SourceValue, DestinationValue>(
    tree: GenTree<SourceValue>,
    f: (value: SourceValue) => DestinationValue,
  ): GenTree<DestinationValue> => ({
    node: {
      value: f(tree.node.value),
      complexity: tree.node.complexity,
    },
    shrinks: pipe(
      tree.shrinks,
      mapIter((shrink) => map(shrink, f)),
    ),
  });

  export const merge = <ElementValue, MergedValue>(
    forest: GenTree<ElementValue>[],
    fMerge: (values: ElementValue[]) => MergedValue,
    fMergeComplexity: (nodes: GenTreeNode<ElementValue>[]) => Complexity,
    shrink: (forest: GenTree<ElementValue>[]) => Iterable<GenTree<ElementValue>[]>,
  ): GenTree<MergedValue> => {
    const node = mergeNode(
      forest.map((tree) => tree.node),
      fMerge,
      fMergeComplexity,
    );

    const treeCullingShrinks = shrink(forest);

    const treeMergingShrinks = pipe(
      forest.map((tree) => tree.shrinks),
      mapIter((shrinks, index) => replaceTreeWithShrinks(forest, shrinks, index)),
      flatMapIter((x) => x),
    );

    return {
      node,
      shrinks: pipe(
        concatIter(treeCullingShrinks, treeMergingShrinks),
        mapIter((forest0) => merge(forest0, fMerge, fMergeComplexity, shrink)),
      ),
    };
  };

  const mergeNode = <ElementValue, MergedValue>(
    elementNodes: GenTreeNode<ElementValue>[],
    fMerge: (values: ElementValue[]) => MergedValue,
    fMergeComplexity: (nodes: GenTreeNode<ElementValue>[]) => Complexity,
  ): GenTreeNode<MergedValue> => ({
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
    shrinkNodes: (forest: GenTree<Value>[]) => Iterable<GenTree<Value>[]>,
  ): GenTree<Value[]> =>
    merge<Value, Value[]>(
      forest,
      (values) => values,
      (nodes) => {
        const mergeComplexity = calculateConcatComplexity(nodes.length);
        return nodes.map((node) => node.complexity).reduce((acc, curr) => acc + curr, mergeComplexity);
      },
      shrinkNodes,
    );

  /* istanbul ignore next */
  const formatInternal = <Value>(
    tree: GenTree<Value>,
    nestCount: number,
    formatValue?: (value: Value) => string,
  ): string => {
    const valueFormatted = formatValue ? formatValue(tree.node.value) : tree.node.value;
    const nodeFormatted = `${'-'.repeat(nestCount * 3)}${valueFormatted} (c = ${tree.node.complexity})`;

    const shrinksFormatted = Array.from(
      pipe(
        tree.shrinks,
        mapIter((i) => formatInternal(i, nestCount + 1, formatValue)),
      ),
    );

    return [nodeFormatted, ...shrinksFormatted].join('\n');
  };

  /* istanbul ignore next */
  export const format = <Value>(tree: GenTree<Value>, formatValue?: (value: Value) => string): string =>
    formatInternal(tree, 0, formatValue);
}
