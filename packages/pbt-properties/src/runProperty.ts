import { Gen, Gens, GenResult, GenInstance, Seed, Size, GenInstanceData } from 'pbt-core';
import { pipe, last, concat, from, first } from 'ix/iterable';
import { map, skip, take } from 'ix/iterable/operators';
import { filterIndexed, indexed, mapIndexed, takeWhileInclusive, zipSafe } from './iterableOperators';
import { PropertyConfig } from './PropertyConfig';
import { PropertyResult } from './PropertyResult';

type GenResults<Values extends any[]> = { [P in keyof Values]: GenResult<Values[P]> };

export type PropertyFunction<Values extends any[]> = (...args: Values) => boolean | void;

export namespace PropertyRunResult {
  export type Success = {
    kind: 'success';
  };

  export type Failure<Values extends any[]> = {
    kind: 'failure';
    reason: PropertyResult.FailureReason;
    seed: Seed;
    size: Size;
    iterationNumber: number;
    counterexample: PropertyResult.Counterexample<Values>;
  };

  export type Exhaustion = {
    kind: 'exhaustion';
    seed: Seed;
    size: Size;
    iterationNumber: number;
  };

  export type InvalidShrinkPath = {
    kind: 'invalidShrinkPath';
  };
}

export type PropertyRunResult<Values extends any[]> =
  | PropertyRunResult.Success
  | PropertyRunResult.Failure<Values>
  | PropertyRunResult.Exhaustion
  | PropertyRunResult.InvalidShrinkPath;

/* istanbul ignore next */
const throwingGenerator = function* () {
  throw new Error('Unexpected: Tried to enumerate a completed iterable');
};

const throwIfIterableCompletes = <T>(iterable: Iterable<T>): Iterable<T> => concat(iterable, from(throwingGenerator()));

const seedGen = <T>(g: Gen<T>, seed: Seed, size: Size): { iterable: Iterable<GenResult<T>>; nextSeed: Seed } => {
  const [leftSeed, rightSeed] = seed.split();
  const iterable = throwIfIterableCompletes(g(leftSeed, size));
  return {
    nextSeed: rightSeed,
    iterable,
  };
};

const seedGens = <Values extends any[]>(gs: Gens<Values>, seed: Seed, size: Size): Iterable<GenResults<Values>> => {
  type GenInvocationsResult<Values extends any[]> = {
    nextSeed: Seed;
    iterables: Iterable<GenResults<Values>>;
  };

  return gs.reduce<GenInvocationsResult<Values>>(
    (result, g) => {
      const { iterable, nextSeed } = seedGen(g, result.nextSeed, size);
      return {
        nextSeed,
        iterables: [...result.iterables, iterable] as Iterable<GenResults<Values>>,
      };
    },
    {
      nextSeed: seed,
      iterables: [] as unknown[],
    } as GenInvocationsResult<Values>,
  ).iterables;
};

const combineGenResults = <Values extends any[]>(rs: GenResults<Values>): GenResult<Values> =>
  rs.every(GenResult.isInstance)
    ? (GenInstance.join(...rs) as GenResult<Values>)
    : rs.some((r) => r.kind === 'exhaustion')
    ? /* istanbul ignore next */ { kind: 'exhaustion' }
    : /* istanbul ignore next */ { kind: 'discard' };

const invokeGens = <Values extends any[]>(gs: Gens<Values>, seed: Seed, size: Size): Iterable<GenResult<Values>> =>
  pipe(
    zipSafe(...seedGens(gs, seed, size)),
    map((genResults) => combineGenResults(genResults as GenResults<Values>)),
  );

const invokePropertyFunction = <Values extends any[]>(
  f: PropertyFunction<Values>,
  values: Values,
): PropertyResult.FailureReason | null => {
  try {
    return f(...values) === false ? { kind: 'predicate' } : null;
  } catch (error) {
    return { kind: 'throws', error };
  }
};

namespace Exploration {
  const isNotNull = <T>(x: T | null): x is T => x !== null;

  const tryFindFailure = <Values extends any[]>(
    f: PropertyFunction<Values>,
    instanceData: GenInstanceData<Values>,
    originalInstanceData: GenInstanceData<Values>,
  ): [PropertyResult.Counterexample<Values>, PropertyResult.FailureReason] | null => {
    const failureReason = invokePropertyFunction(f, instanceData.value);
    if (!failureReason) {
      return null;
    }

    const smallerFailureAndIndex = first(
      pipe(
        instanceData.shrink(),
        indexed(),
        mapIndexed((childInstanceData) => tryFindFailure(f, childInstanceData, originalInstanceData)),
        filterIndexed(isNotNull),
      ),
    );

    if (!smallerFailureAndIndex) {
      return [
        {
          values: instanceData.value,
          originalValues: originalInstanceData.value,
          shrinkPath: [],
        },
        failureReason,
      ];
    }

    const { index: smallerIndex, value: smallerFailure } = smallerFailureAndIndex;
    const [smallerCounterexample, smallerReason] = smallerFailure;
    return [
      {
        shrinkPath: [...smallerCounterexample.shrinkPath, smallerIndex],
        values: smallerCounterexample.values,
        originalValues: originalInstanceData.value,
      },
      smallerReason,
    ];
  };

  type PropertyIterationResult<Values extends any[]> =
    | Pick<PropertyRunResult.Success, 'kind'>
    | Pick<PropertyRunResult.Failure<Values>, 'kind' | 'reason' | 'counterexample'>
    | Pick<PropertyRunResult.Exhaustion, 'kind'>;

  const mapGenResultToPropertyIterationResult = <Values extends any[]>(
    f: PropertyFunction<Values>,
    genResult: GenResult<Values>,
  ): PropertyIterationResult<Values> => {
    switch (genResult.kind) {
      case 'instance': {
        const failure = tryFindFailure(f, genResult, genResult);
        if (!failure) {
          return { kind: 'success' };
        }

        const [counterexample, reason] = failure;
        return {
          kind: 'failure',
          counterexample,
          reason,
        };
      }
      default:
        return { kind: 'exhaustion' };
    }
  };

  const runIteration = <Values extends any[]>(
    gs: Gens<Values>,
    f: PropertyFunction<Values>,
    seed: Seed,
    size: Size,
  ): PropertyIterationResult<Values> => {
    const propertyIterationResult = first(
      pipe(
        invokeGens(gs, seed, size),
        map((r) => mapGenResultToPropertyIterationResult(f, r)),
      ),
    );

    /* istanbul ignore next */
    if (!propertyIterationResult) {
      throw new Error('Fatal: Failed to run iteration');
    }

    return propertyIterationResult;
  };

  const runIterations = function* <Values extends any[]>(
    gs: Gens<Values>,
    f: PropertyFunction<Values>,
    initialSeed: Seed,
    initialSize: Size,
  ): Iterable<PropertyRunResult<Values>> {
    let currentSeed = initialSeed;

    for (let iterationNumber = 1; iterationNumber <= Number.MAX_SAFE_INTEGER; iterationNumber++) {
      const [leftSeed, rightSeed] = currentSeed.split();

      const iterationSizeOffset = iterationNumber - 1;
      const untruncatedSize = initialSize + iterationSizeOffset;
      const currentSize = ((untruncatedSize - 1) % 100) + 1;

      const iterationResult = runIteration(gs, f, leftSeed, currentSize);
      switch (iterationResult.kind) {
        case 'failure':
          yield {
            kind: 'failure',
            reason: iterationResult.reason,
            counterexample: iterationResult.counterexample,
            iterationNumber,
            seed: currentSeed,
            size: currentSize,
          };
        case 'exhaustion':
          yield {
            kind: 'exhaustion',
            iterationNumber,
            seed: currentSeed,
            size: currentSize,
          };
        case 'success':
          yield { kind: 'success' };
      }

      currentSeed = rightSeed;
    }
  };

  export const exploreProperty = <Values extends any[]>(
    gs: Gens<Values>,
    f: PropertyFunction<Values>,
    initialSeed: Seed,
    initialSize: Size,
    iterations: number,
  ): PropertyRunResult<Values> => {
    const lastIteration = last(
      pipe(
        from(runIterations(gs, f, initialSeed, initialSize)),
        take(iterations),
        takeWhileInclusive((x) => x.kind === 'success'),
      ),
    );

    /* istanbul ignore next */
    if (lastIteration === undefined) {
      throw new Error('Unexpected: Could not attempt any iterations.');
    }

    return lastIteration;
  };
}

namespace Reproduction {
  /* istanbul ignore next */
  const throwUnhandled = <T>(str: string): T => {
    throw new Error(str);
  };

  const traverseShrinkPath = <Values extends any[]>(
    g: GenInstanceData<Values>,
    shrinkPath: number[],
  ): GenInstanceData<Values> | null => {
    const shrinkComponent: number | undefined = shrinkPath[0];
    if (shrinkComponent === undefined) {
      return g;
    }

    const currentData = first(pipe(g.shrink(), skip(shrinkComponent)));
    if (!currentData) {
      return null;
    }

    return traverseShrinkPath(currentData, shrinkPath.slice(1));
  };

  const genInitial = <Values extends any[]>(
    gs: Gens<Values>,
    initialSeed: Seed,
    initialSize: Size,
  ): GenInstanceData<Values> =>
    first(
      pipe(
        invokeGens(gs, initialSeed, initialSize),
        map((x) =>
          GenResult.isInstance(x)
            ? x
            : /* istanbul ignore next */ throwUnhandled<GenInstance<Values>>('Expected kind = "instance"'),
        ),
      ),
    )!;

  export const reproduceProperty = <Values extends any[]>(
    gs: Gens<Values>,
    f: PropertyFunction<Values>,
    initialSeed: Seed,
    initialSize: Size,
    shrinkPath: number[],
  ): PropertyRunResult<Values> => {
    // Split the seed, like it was in the original run
    const [leftSeed] = initialSeed.split();
    const rootInstance = genInitial(gs, leftSeed, initialSize)!;
    const shrunkInstance = traverseShrinkPath(rootInstance, shrinkPath);

    if (!shrunkInstance) {
      return { kind: 'invalidShrinkPath' };
    }

    const reason = invokePropertyFunction(f, shrunkInstance.value);
    if (!reason) {
      return { kind: 'success' };
    }

    return {
      kind: 'failure',
      reason,
      iterationNumber: 1,
      seed: initialSeed,
      size: initialSize,
      counterexample: {
        shrinkPath,
        values: shrunkInstance.value,
        originalValues: rootInstance.value,
      },
    };
  };
}

const runProperty = <Values extends any[]>(
  gs: Gens<Values>,
  f: PropertyFunction<Values>,
  config: PropertyConfig,
): PropertyRunResult<Values> => {
  const { iterations, seed, size, shrinkPath } = config;
  return shrinkPath
    ? Reproduction.reproduceProperty(gs, f, seed, size, shrinkPath)
    : Exploration.exploreProperty(gs, f, seed, size, iterations);
};

export default runProperty;
