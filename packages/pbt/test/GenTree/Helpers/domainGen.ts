import fc from 'fast-check';
import * as sharedDomainGen from '../../Helpers/domainGen';
import { GenTree } from '../../../src/GenTree';

export const func = sharedDomainGen.func;

export const anyFunc = (
  constraints?: sharedDomainGen.FunctionConstraints,
): fc.Arbitrary<(...args: unknown[]) => unknown> => func(anything(), constraints);

export const anything = fc.anything;
export const naturalNumber = fc.nat;
export const array = fc.array;

const internalTree = <T>(
  valueGen: fc.Arbitrary<T>,
): {
  node: fc.Arbitrary<GenTree.Node<T>>;
  shrinks: fc.Arbitrary<GenTree<T>[]>;
} =>
  fc.letrec((tieUnsafe) => {
    type Tie = ((key: 'node') => fc.Arbitrary<GenTree.Node<T>>) &
      ((key: 'shrinks') => fc.Arbitrary<Iterable<GenTree<T>>>);
    const tie = tieUnsafe as Tie;

    const node: fc.Arbitrary<GenTree.Node<T>> = fc
      .tuple(valueGen, naturalNumber())
      .map(([value, complexity]) => ({ value, complexity }));

    const shrinks = fc.frequency(
      {
        arbitrary: fc.constant([]),
        weight: 4,
      },
      {
        arbitrary: fc.array(
          fc.tuple(tie('node'), tie('shrinks')).map(
            ([node, shrinks]): GenTree<T> => ({
              node,
              shrinks,
            }),
          ),
        ),
        weight: 1,
      },
    );

    return {
      node,
      shrinks,
    };
  });

export const node = <T>(valueGen: fc.Arbitrary<T>): fc.Arbitrary<GenTree.Node<T>> => internalTree<T>(valueGen).node;

export const shrinks = <T>(valueGen: fc.Arbitrary<T>): fc.Arbitrary<Iterable<GenTree<T>>> =>
  internalTree<T>(valueGen).shrinks;

export const anyShrinks = () => internalTree(anything()).shrinks;

export const tree = <T>(valueGen: fc.Arbitrary<T>): fc.Arbitrary<GenTree<T>> =>
  fc.tuple(node(valueGen), shrinks(valueGen)).map(([node, shrinks]) => ({ node, shrinks }));

export const anyTree = () => tree(anything());
