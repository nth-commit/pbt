import { OperatorFunction, UnaryFunction } from 'ix/interfaces';
import { IterableX, pipe } from 'ix/iterable';
import { map, tap } from 'ix/iterable/operators';

const getMaxIterations = (): number | undefined => (globalThis as any).__pbtInfiniteStreamProtection;

const crashAfter = <T>(maxIterations: number): UnaryFunction<Iterable<T>, IterableX<T>> => {
  let iterationCount = 0;
  return tap(() => {
    iterationCount++;
    /* istanbul ignore next */
    if (iterationCount > maxIterations) {
      throw new Error('Infinite loop protection');
    }
  });
};

export const addInfiniteStreamProtection = <T>(): OperatorFunction<T, T> => (source: Iterable<T>): IterableX<T> => {
  const maxIterations = getMaxIterations();
  /* istanbul ignore next */
  return maxIterations === undefined ? pipe(source) : pipe(source, crashAfter(maxIterations));
};

export class TakeWhileInclusiveIterable<TSource> extends IterableX<TSource> {
  private _source: Iterable<TSource>;
  private _predicate: (value: TSource, index: number) => boolean;

  constructor(source: Iterable<TSource>, predicate: (value: TSource, index: number) => boolean) {
    super();
    this._source = source;
    this._predicate = predicate;
  }

  *[Symbol.iterator]() {
    let i = 0;
    for (const item of this._source) {
      yield item;
      if (!this._predicate(item, i++)) {
        break;
      }
    }
  }
}

export const takeWhileInclusive = <T>(predicate: (value: T, index: number) => boolean): OperatorFunction<T, T> => (
  source: Iterable<T>,
): IterableX<T> => new TakeWhileInclusiveIterable<T>(source, predicate);

export type Indexed<T> = { value: T; index: number };

export const indexed = <TSource>(): OperatorFunction<TSource, { value: TSource; index: number }> => {
  return map((value, index) => ({ value, index }));
};
