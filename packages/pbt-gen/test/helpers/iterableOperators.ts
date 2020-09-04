import { OperatorFunction } from 'ix/interfaces';
import { IterableX } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';

export const cast = <T>(): OperatorFunction<unknown, T> => (source: Iterable<unknown>): IterableX<T> =>
  map((x) => x as T)(source);

export const castToInstance = <T>(): OperatorFunction<devCore.GenResult<T>, devCore.GenInstance<T>> => (
  source: Iterable<devCore.GenResult<T>>,
): IterableX<devCore.GenInstance<T>> => cast<devCore.GenInstance<T>>()(source);
