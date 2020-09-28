import { OperatorFunction } from 'ix/interfaces';
import { IterableX, zip, repeatValue } from 'ix/iterable';
import { filter, map } from 'ix/iterable/operators';

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

export const zipSafe = <T>(...sources: Iterable<T>[]) => (sources.length === 0 ? repeatValue([]) : zip(...sources));

export type Indexed<T> = { value: T; index: number };

export const indexed = <TSource>(): OperatorFunction<TSource, { value: TSource; index: number }> => {
  return map((value, index) => ({ value, index }));
};

export const mapIndexed = <TSourceValue, TResultValue>(
  f: (x: TSourceValue) => TResultValue,
): OperatorFunction<Indexed<TSourceValue>, Indexed<TResultValue>> => {
  return map(({ index, value }) => ({
    index,
    value: f(value),
  }));
};

export function filterIndexed<TSourceValue, TResultValue extends TSourceValue>(
  predicate: (x: TSourceValue) => x is TResultValue,
): OperatorFunction<Indexed<TSourceValue>, Indexed<TResultValue>>;
export function filterIndexed<TSourceValue>(
  predicate: (x: TSourceValue) => boolean,
): OperatorFunction<Indexed<TSourceValue>, Indexed<TSourceValue>>;
export function filterIndexed<TSourceValue>(
  predicate: (x: TSourceValue) => boolean,
): OperatorFunction<Indexed<TSourceValue>, Indexed<TSourceValue>> {
  return filter(({ value }) => predicate(value));
}

export class ConcatWithLastIterable<TSource, TNextSource> extends IterableX<TSource | TNextSource> {
  constructor(private source: Iterable<TSource>, private nextGenerator: (value: TSource) => Iterable<TNextSource>) {
    super();
  }

  *[Symbol.iterator]() {
    let last: TSource | undefined = undefined;
    for (const item of this.source) {
      yield item;
      last = item;
    }

    if (last !== undefined) {
      yield* this.nextGenerator(last);
    }
  }
}

export const concatWithLast = <T, T2>(nextGenerator: (last: T) => Iterable<T2>): OperatorFunction<T, T | T2> => (
  source: Iterable<T>,
): IterableX<T | T2> => new ConcatWithLastIterable(source, nextGenerator);
