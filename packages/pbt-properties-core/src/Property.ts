import { Gen, GenResult } from 'pbt-generator-core';
import { pipe, last } from 'ix/iterable';
import { map, take } from 'ix/iterable/operators';
import { success, exhaustionFailure, predicateFailure, PropertyResult } from './PropertyResult';
import { indexed, mapIndexed, takeWhileInclusive } from './iterableOperators';
import { PropertyConfig, validateConfig } from './PropertyConfig';

type GenOutput<T> = T extends Gen<infer U> ? U : never;

type GenOutputs<T extends Array<Gen<any>>> = { [P in keyof T]: GenOutput<T[P]> };

export interface Property<T> {
  (config: PropertyConfig): PropertyResult;
  _?: T;
}

export type PropertyFunction<T extends Array<Gen<any>>> = (...args: GenOutputs<T>) => boolean;

type PropertyIterationResult = 'success' | 'predicateFailure' | 'exhaustionFailure';

export const property = <T extends Array<Gen<any>>>(...args: [...T, PropertyFunction<T>]): Property<GenOutputs<T>> => {
  return config => {
    const validationError = validateConfig(config);
    if (validationError) return validationError;

    const { iterations, seed } = config;
    const gens = args.slice(0, args.length - 1) as T;
    const f = args[args.length - 1] as PropertyFunction<T>;

    /* istanbul ignore next */
    if (gens.length === 0 || gens.length > 1) throw 'unhandled';

    const gen = gens[0];

    const genIterable = gen(seed, 0);

    const lastIteration = last(
      pipe(
        genIterable,
        indexed(),
        take(iterations),
        mapIndexed(
          (genResult): PropertyIterationResult => {
            switch (genResult.kind) {
              case 'instance':
                return (f as any)(genResult.value) ? 'success' : 'predicateFailure';
              case 'exhaustion':
                return 'exhaustionFailure';
            }
          },
        ),
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
