import { GenTree } from '../../GenTree';
import { ScaleMode, Range } from '../Range';
import { Shrink } from '../Shrink';
import { GenImpl } from './GenImpl';
import { Gen } from '../Gen';
import { GenTransformation } from '../GenTransformation';

export type ArrayGen<T> = Gen<T[]> & {
  betweenLengths(min: number, max: number): ArrayGen<T>;
  ofLength(length: number): ArrayGen<T>;
  ofMinLength(min: number): ArrayGen<T>;
  ofMaxLength(max: number): ArrayGen<T>;
  noBias(): ArrayGen<T>;
};

export const ArrayGen = {
  create: <T>(elementGen: Gen<T>): ArrayGen<T> => {
    class ArrayGenImpl extends GenImpl<T, T[]> implements ArrayGen<T> {
      constructor(private config: ArrayGenConfig) {
        super(elementGen, arrayTransformation(config));
      }

      betweenLengths(min: number, max: number): ArrayGen<T> {
        return this.withConfig({ min, max });
      }

      ofLength(length: number): ArrayGen<T> {
        return this.betweenLengths(length, length);
      }

      ofMinLength(min: number): ArrayGen<T> {
        return this.withConfig({ min });
      }

      ofMaxLength(max: number): ArrayGen<T> {
        return this.withConfig({ max });
      }

      noBias(): ArrayGen<T> {
        return this.withConfig({ scale: 'constant' });
      }

      private withConfig(config: Partial<ArrayGenConfig>): ArrayGen<T> {
        return new ArrayGenImpl({
          ...this.config,
          ...config,
        });
      }
    }

    return new ArrayGenImpl({ min: null, max: null, scale: null });
  },
};

type ArrayGenConfig = Readonly<{
  min: number | null;
  max: number | null;
  scale: ScaleMode | null;
}>;

const arrayTransformation = <T>(config: ArrayGenConfig): GenTransformation<T, T[]> => {
  const min = tryDeriveMin(config.min);
  if (typeof min === 'string') return () => Gen.error(min);

  const max = tryDeriveMax(config.max);
  if (typeof max === 'string') return () => Gen.error(max);

  const range = Range.createFrom(min, max, Math.min(min, max), config.scale || 'linear');

  return GenTransformation.collect(range, Shrink.array(range.origin, getOrderOfTree));
};

const tryDeriveMin = (min: number | null): number | string => {
  if (min === null) return 0;
  if (!Number.isInteger(min)) return `Minimum must be an integer, min = ${min}`;
  if (min < 0) return `Minimum must be at least 0, min = ${min}`;
  return min;
};

const tryDeriveMax = (max: number | null): number | string => {
  if (max === null) return 10;
  if (!Number.isInteger(max)) return `Maximum must be an integer, min = ${max}`;
  if (max < 0) return `Maximum must be at least 0, min = ${max}`;
  return max;
};

/* istanbul ignore next */
const getOrderOfTree = <T>(tree: GenTree<T>): number =>
  Array.isArray(tree.node.value)
    ? // If the node value is an array, that is, we are building an "array of arrays", it is "less complex" to
      // order the inner arrays by descending length. It also lets us find the minimal shrink a lot more efficiently
      // in some examples, e.g.: https://github.com/jlink/shrinking-challenge/blob/main/challenges/large_union_list.md
      -tree.node.complexity
    : // Else, sort the elements in ascending order of complexity (smallest first).
      tree.node.complexity;
