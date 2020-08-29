import { OperatorFunction } from 'ix/interfaces';
import { IterableX } from 'ix/iterable';

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
