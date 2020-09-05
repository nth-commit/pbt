import { OperatorFunction, UnaryFunction } from 'ix/interfaces';
import { IterableX, pipe } from 'ix/iterable';
import { tap } from 'ix/iterable/operators';

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
