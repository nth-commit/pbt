import { Gen, Gens, GenResult, GenInstance, Seed, Size, GenInstanceData } from 'pbt-core';
import { pipe, last, concat, from, first } from 'ix/iterable';
import { map, skip, take } from 'ix/iterable/operators';
import { filterIndexed, indexed, mapIndexed, takeWhileInclusive, zipSafe } from './iterableOperators';
import { PropertyConfig } from './PropertyConfig';

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

type GenOutput<T> = T extends Gen<infer U> ? GenResult<U> : never;

export type PropertyFunction<TGens extends Gens> = (...args: GenValues<TGens>) => boolean;

export type PropertyIterationStatus = 'success' | 'predicateFailure' | 'exhaustionFailure';

export type PropertyCounterexample<TGens extends Gens> = {
  originalValues: GenValues<TGens>;
  values: GenValues<TGens>;
  shrinkPath: number[];
};

export type PropertyIterationResult<TGens extends Gens> = {
  iterationStatus: 'success' | 'predicateFailure' | 'exhaustionFailure';
  iterationNumber: number;
  seed: Seed;
  size: Size;
  counterexample: PropertyCounterexample<TGens> | null;
};

export type PropertyRunResult<TGens extends Gens> = {
  lastIteration: PropertyIterationResult<TGens>;
};

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
      // TODO: Prevent against this bug:
      // const { iterable, nextSeed } = invokeGen(g, seed, size);
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

  const runIteration = <TGens extends Gens>(
    gs: TGens,
    f: PropertyFunction<TGens>,
    seed: Seed,
    size: Size,
  ): [PropertyIterationStatus, PropertyCounterexample<TGens> | null] => {
    const statusAndCounterexample = first(
      pipe(
        invokeGens(gs, seed, size),
        map((r): [PropertyIterationStatus, PropertyCounterexample<TGens> | null] | undefined => {
          if (r.kind === 'instance') {
            const counterexample = tryFindCounterexample(f, r, r);
            return counterexample === NOT_A_COUNTEREXAMPLE ? ['success', null] : ['predicateFailure', counterexample];
          }

          return ['exhaustionFailure', null];
        }),
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
  ): Iterable<PropertyIterationResult<TGens>> {
    for (let iterationNumber = 1; iterationNumber <= Number.MAX_SAFE_INTEGER; iterationNumber++) {
      const iterationSizeOffset = iterationNumber - 1;
      const untruncatedSize = initialSize + iterationSizeOffset;
      const currentSize = ((untruncatedSize - 1) % 100) + 1;

      const [iterationStatus, counterexample] = runIteration(gs, f, initialSeed, currentSize);

      yield {
        iterationNumber,
        iterationStatus,
        seed: initialSeed,
        size: currentSize,
        counterexample,
      };
    }
  };

  export const exploreProperty = <TGens extends Gens>(
    gs: TGens,
    f: PropertyFunction<TGens>,
    initialSeed: Seed,
    initialSize: Size,
    iterations: number,
  ): PropertyIterationResult<TGens> => {
    const lastIteration = last(
      pipe(
        from(runIterations(gs, f, initialSeed, initialSize)),
        take(iterations),
        takeWhileInclusive((x) => x.iterationStatus === 'success'),
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
  ): GenInstanceData<GenValues<TGens>> => {
    const shrinkComponent: number | undefined = shrinkPath[0];
    if (shrinkComponent === undefined) {
      return g;
    }

    const currentData = first(pipe(g.shrink(), skip(shrinkComponent)));

    /* istanbul ignore next */
    if (!currentData) {
      throw 'Invalid shrink path';
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
  ): PropertyIterationResult<TGens> => {
    const rootInstance = genInitial(gs, initialSeed, initialSize)!;
    const shrunkValues = traverseShrinkPath(rootInstance, shrinkPath);

    /* istanbul ignore next */
    const iterationStatus: PropertyIterationStatus = invokePropertyFunction(f, shrunkValues)
      ? 'success'
      : 'predicateFailure';

    return {
      iterationStatus,
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

  return {
    lastIteration: shrinkPath
      ? Reproduction.reproduceProperty(gs, f, seed, size, shrinkPath)
      : Exploration.exploreProperty(gs, f, seed, size, iterations),
  };
};

export default runProperty;
