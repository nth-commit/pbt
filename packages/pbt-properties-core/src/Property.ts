import { Gen, GenResult } from 'pbt-generator-core';
import { pipe, last } from 'ix/iterable';
import { map, take } from 'ix/iterable/operators';
import { success, exhaustionFailure, predicateFailure, PropertyResult } from './PropertyResult';
import { indexed, mapIndexed, takeWhileInclusive } from './iterableOperators';
import { PropertyConfig, validateConfig } from './PropertyConfig';

export interface Property<T> {
  (config: PropertyConfig): PropertyResult;
  _?: T;
}

export type PropertyFunction<T> = (x: T) => boolean;

type PropertyIterationResult = 'success' | 'predicateFailure' | 'exhaustionFailure';

const runIteration = <T>(genResult: GenResult<T>, f: PropertyFunction<T>): PropertyIterationResult => {
  switch (genResult.kind) {
    case 'instance':
      return f(genResult.value) ? 'success' : 'predicateFailure';
    case 'exhaustion':
      return 'exhaustionFailure';
  }
};

export const property = <T>(g: Gen<T>, f: PropertyFunction<T>): Property<T> => {
  return config => {
    const validationError = validateConfig(config);
    if (validationError) return validationError;

    const { iterations, seed } = config;

    const genResults = g(seed, 0);

    const lastIteration = last(
      pipe(
        genResults,
        indexed(),
        take(iterations),
        mapIndexed(genResult => runIteration(genResult, f)),
        takeWhileInclusive(x => x.value === 'success'),
        map(({ index, value }) => ({
          iterationNumber: index + 1,
          iterationResult: value,
        })),
      ),
    );

    if (!lastIteration) {
      return exhaustionFailure(iterations, 0);
    }

    switch (lastIteration.iterationResult) {
      case 'success':
        return lastIteration.iterationNumber < iterations
          ? exhaustionFailure(iterations, lastIteration.iterationNumber)
          : success();
      case 'exhaustionFailure':
        return exhaustionFailure(iterations, lastIteration.iterationNumber - 1);
      case 'predicateFailure':
        return predicateFailure();
    }
  };
};
