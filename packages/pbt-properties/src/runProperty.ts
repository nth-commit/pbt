import { Gen, Gens, GenResult, GenInstance, Seed, Size, GenInstanceData } from 'pbt-core';
import { pipe, last, concat, from, first } from 'ix/iterable';
import { map, skip, take } from 'ix/iterable/operators';
import { filterIndexed, indexed, mapIndexed, takeWhileInclusive, zipSafe } from './iterableOperators';
import { PropertyConfig } from './PropertyConfig';

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

type GenOutput<T> = T extends Gen<infer U> ? GenResult<U> : never;

export type PropertyFunction<TGens extends Gens> = (...args: GenValues<TGens>) => boolean;

export type PropertyCounterexample<TGens extends Gens> = {
  originalValues: GenValues<TGens>;
  values: GenValues<TGens>;
  shrinkPath: number[];
};

type SuccessPropertyRunResult = {
  kind: 'success';
};

type PredicateFailurePropertyRunResult<TGens extends Gens> = {
  kind: 'predicateFailure';
  seed: Seed;
  size: Size;
  iterationNumber: number;
  counterexample: PropertyCounterexample<TGens> | null;
};

type ExhaustionFailurePropertyRunResult = {
  kind: 'exhaustionFailure';
  seed: Seed;
  size: Size;
  iterationNumber: number;
};

type InvalidShrinkPathPropertyRunResult = {
  kind: 'invalidShrinkPath';
};

export type PropertyRunResult<TGens extends Gens> =
  | SuccessPropertyRunResult
  | PredicateFailurePropertyRunResult<TGens>
  | ExhaustionFailurePropertyRunResult
  | InvalidShrinkPathPropertyRunResult;

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

const seedGens = <TGens extends Gens>(gs: TGens, seed: Seed, size: Size): Iterable<GenResults<TGens>> => {
  type GenInvocationsResult<TGens extends Gens> = {
    nextSeed: Seed;
    iterables: Iterable<GenResults<TGens>>;
  };

  return gs.reduce<GenInvocationsResult<TGens>>(
    (result, g) => {
      const { iterable, nextSeed } = seedGen(g, result.nextSeed, size);
      return {
        nextSeed,
        iterables: [...result.iterables, iterable] as Iterable<GenResults<TGens>>,
      };
    },
    {
      nextSeed: seed,
      iterables: [] as unknown[],
    } as GenInvocationsResult<TGens>,
  ).iterables;
};

type GenResults<TGens extends Gens> = { [P in keyof TGens]: GenOutput<TGens[P]> };

const combineGenResults = <TGens extends Gens>(rs: GenResults<TGens>): GenResult<GenValues<TGens>> =>
  rs.every(GenResult.isInstance)
    ? (GenInstance.join(...rs) as GenResult<GenValues<TGens>>)
    : rs.some((r) => r.kind === 'exhaustion')
    ? /* istanbul ignore next */ { kind: 'exhaustion' }
    : /* istanbul ignore next */ { kind: 'discard' };

const invokeGens = <TGens extends Gens>(gs: TGens, seed: Seed, size: Size): Iterable<GenResult<GenValues<TGens>>> =>
  pipe(
    zipSafe(...seedGens(gs, seed, size)),
    map((genResults) => combineGenResults(genResults as GenResults<TGens>)),
  );

const invokePropertyFunction = <TGens extends Gens>(
  f: PropertyFunction<TGens>,
  instanceData: GenInstanceData<any[]>,
): boolean => {
  const unsafeF = f as (...args: any[]) => boolean;
  return unsafeF(...instanceData.value);
};

namespace Exploration {
  const NOT_A_COUNTEREXAMPLE = Symbol();

  const isCounterexample = <TGens extends Gens>(
    maybeCounterexample: PropertyCounterexample<TGens> | typeof NOT_A_COUNTEREXAMPLE,
  ): maybeCounterexample is PropertyCounterexample<TGens> => maybeCounterexample !== NOT_A_COUNTEREXAMPLE;

  const tryFindCounterexample = <TGens extends Gens>(
    f: PropertyFunction<TGens>,
    instanceData: GenInstanceData<GenValues<TGens>>,
    originalInstanceData: GenInstanceData<GenValues<TGens>>,
  ): PropertyCounterexample<TGens> | typeof NOT_A_COUNTEREXAMPLE => {
    if (invokePropertyFunction(f, instanceData)) {
      return NOT_A_COUNTEREXAMPLE;
    }

    const maybeIndexedSimplerCounterexample = first(
      pipe(
        instanceData.shrink(),
        indexed(),
        mapIndexed((childInstanceData) => tryFindCounterexample(f, childInstanceData, originalInstanceData)),
        filterIndexed(isCounterexample),
      ),
    );

    return maybeIndexedSimplerCounterexample
      ? {
          shrinkPath: [...maybeIndexedSimplerCounterexample.value.shrinkPath, maybeIndexedSimplerCounterexample.index],
          values: maybeIndexedSimplerCounterexample.value.values,
          originalValues: originalInstanceData.value,
        }
      : {
          shrinkPath: [],
          values: instanceData.value,
          originalValues: originalInstanceData.value,
        };
  };

  type PropertyIterationResult<TGens extends Gens> =
    | Pick<SuccessPropertyRunResult, 'kind'>
    | Pick<PredicateFailurePropertyRunResult<TGens>, 'kind' | 'counterexample'>
    | Pick<ExhaustionFailurePropertyRunResult, 'kind'>;

  const runIteration = <TGens extends Gens>(
    gs: TGens,
    f: PropertyFunction<TGens>,
    seed: Seed,
    size: Size,
  ): PropertyIterationResult<TGens> => {
    const statusAndCounterexample = first(
      pipe(
        invokeGens(gs, seed, size),
        map(
          (r): PropertyIterationResult<TGens> => {
            if (r.kind === 'instance') {
              const counterexample = tryFindCounterexample(f, r, r);
              return counterexample === NOT_A_COUNTEREXAMPLE
                ? { kind: 'success' }
                : { kind: 'predicateFailure', counterexample };
            }

            return {
              kind: 'exhaustionFailure',
            };
          },
        ),
      ),
    );

    /* istanbul ignore next */
    if (!statusAndCounterexample) {
      throw new Error('Fatal: Failed to run iteration');
    }

    return statusAndCounterexample;
  };

  const runIterations = function* <TGens extends Gens>(
    gs: TGens,
    f: PropertyFunction<TGens>,
    initialSeed: Seed,
    initialSize: Size,
  ): Iterable<PropertyRunResult<TGens>> {
    let currentSeed = initialSeed;

    for (let iterationNumber = 1; iterationNumber <= Number.MAX_SAFE_INTEGER; iterationNumber++) {
      const [leftSeed, rightSeed] = currentSeed.split();

      const iterationSizeOffset = iterationNumber - 1;
      const untruncatedSize = initialSize + iterationSizeOffset;
      const currentSize = ((untruncatedSize - 1) % 100) + 1;

      const iterationResult = runIteration(gs, f, leftSeed, currentSize);
      switch (iterationResult.kind) {
        case 'predicateFailure':
          yield {
            kind: 'predicateFailure',
            counterexample: iterationResult.counterexample,
            iterationNumber,
            seed: currentSeed,
            size: currentSize,
          };
        case 'exhaustionFailure':
          yield {
            kind: 'exhaustionFailure',
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

  export const exploreProperty = <TGens extends Gens>(
    gs: TGens,
    f: PropertyFunction<TGens>,
    initialSeed: Seed,
    initialSize: Size,
    iterations: number,
  ): PropertyRunResult<TGens> => {
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

  const traverseShrinkPath = <TGens extends Gens>(
    g: GenInstanceData<GenValues<TGens>>,
    shrinkPath: number[],
  ): GenInstanceData<GenValues<TGens>> | null => {
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

  const genInitial = <TGens extends Gens>(
    gs: TGens,
    initialSeed: Seed,
    initialSize: Size,
  ): GenInstanceData<GenValues<TGens>> =>
    first(
      pipe(
        invokeGens(gs, initialSeed, initialSize),
        map((x) =>
          GenResult.isInstance(x)
            ? x
            : /* istanbul ignore next */ throwUnhandled<GenInstance<GenValues<TGens>>>('Expected kind = "instance"'),
        ),
      ),
    )!;

  export const reproduceProperty = <TGens extends Gens>(
    gs: TGens,
    f: PropertyFunction<TGens>,
    initialSeed: Seed,
    initialSize: Size,
    shrinkPath: number[],
  ): PropertyRunResult<TGens> => {
    // Split the seed, like it was in the original run
    const [leftSeed] = initialSeed.split();
    const rootInstance = genInitial(gs, leftSeed, initialSize)!;
    const shrunkValues = traverseShrinkPath(rootInstance, shrinkPath);

    if (!shrunkValues) {
      return { kind: 'invalidShrinkPath' };
    }

    /* istanbul ignore next */
    return invokePropertyFunction(f, shrunkValues)
      ? { kind: 'success' }
      : {
          kind: 'predicateFailure',
          iterationNumber: 1,
          seed: initialSeed,
          size: initialSize,
          counterexample: {
            shrinkPath,
            values: shrunkValues.value,
            originalValues: rootInstance.value,
          },
        };
  };
}

const runProperty = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  config: PropertyConfig,
): PropertyRunResult<TGens> => {
  const { iterations, seed, size, shrinkPath } = config;
  return shrinkPath
    ? Reproduction.reproduceProperty(gs, f, seed, size, shrinkPath)
    : Exploration.exploreProperty(gs, f, seed, size, iterations);
};

export default runProperty;
