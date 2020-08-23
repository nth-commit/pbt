import { Gen, GenResult, Seed, Size } from 'pbt-generator-core';
import { pipe, last, of } from 'ix/iterable';
import { map, take, flatMap } from 'ix/iterable/operators';
import { indexed, mapIndexed, takeWhileInclusive } from './iterableOperators';
import { PropertyParameter, ForAllGen } from './parameters';

export type PropertyConfig = {
  iterations: number;
  seed: Seed;
};

export type PropertyValidationFailure = {
  kind: 'validationFailure';
  problem: {
    kind: 'iterations';
    message: string;
  };
};

export type PropertyFailure = {
  kind: 'failure';
  problem:
    | {
        kind: 'predicate';
      }
    | {
        kind: 'exhaustion';
        iterationsRequested: number;
        iterationsCompleted: number;
      };
};

export type PropertySuccess = {
  kind: 'success';
};

export type PropertyResult = PropertyValidationFailure | PropertySuccess | PropertyFailure;

export interface Property<T> {
  (config: PropertyConfig): PropertyResult;
}

export type PropertyFunction<T> = (x: T) => boolean;

const validateIterations = (iterations: number): PropertyValidationFailure | null => {
  if (iterations < 1) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'iterations',
        message: 'Number of iterations must be greater than 0',
      },
    };
  }

  if (Math.round(iterations) !== iterations) {
    return {
      kind: 'validationFailure',
      problem: {
        kind: 'iterations',
        message: 'Number of iterations must be an integer',
      },
    };
  }

  return null;
};

type PropertyIterationResult = 'success' | 'predicateFailure' | 'exhaustionFailure';

const beginIteration = <T>(p: PropertyParameter<T>, seed: Seed, size: Size): Iterable<GenResult<T>> => {
  if (typeof p === 'function') {
    return p(seed, size);
  }

  return pipe(
    p.gen(seed, size),
    flatMap(genResult => {
      switch (genResult.kind) {
        case 'instance':
          return genResult.value
            .map<GenResult<T>>(x => ({
              kind: 'instance',
              value: x,
              shrink: null as any,
            }))
            .values();
        case 'exhaustion':
          return of(genResult);
      }
    }),
  );
};

const runIteration = <T>(genResult: GenResult<T>, f: PropertyFunction<T>): PropertyIterationResult => {
  switch (genResult.kind) {
    case 'instance':
      return f(genResult.value) ? 'success' : 'predicateFailure';
    case 'exhaustion':
      return 'exhaustionFailure';
  }
};

const exhaustionFailure = (iterationsRequested: number, iterationsCompleted: number): PropertyFailure => ({
  kind: 'failure',
  problem: {
    kind: 'exhaustion',
    iterationsRequested,
    iterationsCompleted,
  },
});

const predicateFailure = (): PropertyFailure => ({
  kind: 'failure',
  problem: {
    kind: 'predicate',
  },
});

const success = (): PropertySuccess => ({
  kind: 'success',
});

export const property = <T>(p: PropertyParameter<T>, f: PropertyFunction<T>): Property<T> => {
  return ({ iterations, seed }) => {
    const iterationsValidationError = validateIterations(iterations);
    if (iterationsValidationError) return iterationsValidationError;

    const genResults = beginIteration(p, seed, 0);

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
