import { Gen, Gens, GenResult, GenInstance, Seed, Size, GenInstanceData } from 'pbt-core';
import { pipe, last, zip, concat, from, first } from 'ix/iterable';
import { filter, map, take } from 'ix/iterable/operators';
import { takeWhileInclusive, zipSafe } from './iterableOperators';
import { PropertyConfig } from './PropertyConfig';

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

type GenOutput<T> = T extends Gen<infer U> ? GenResult<U> : never;

type IterableGenOutputs<TGens extends Gens> = { [P in keyof TGens]: Iterable<GenOutput<TGens[P]>> };

export type PropertyFunction<TGens extends Gens> = (...args: GenValues<TGens>) => boolean;

export type PropertyIterationStatus = 'success' | 'predicateFailure' | 'exhaustionFailure';

export type PropertyCounterexample<TGens extends Gens> = {
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

type GenInvocationsResult<TGens extends Gens> = {
  nextSeed: Seed;
  iterables: IterableGenOutputs<TGens>;
};

/* istanbul ignore next */
const throwingGenerator = function* () {
  throw new Error('Unexpected: Tried to enumerate a completed iterable');
};

const throwIfIterableCompletes = <T>(iterable: Iterable<T>): Iterable<T> => concat(iterable, from(throwingGenerator()));

const invokeGen = <T>(g: Gen<T>, seed: Seed, size: Size): { iterable: Iterable<GenResult<T>>; nextSeed: Seed } => {
  const [leftSeed, rightSeed] = seed.split();
  const iterable = throwIfIterableCompletes(g(leftSeed, size));
  return {
    nextSeed: rightSeed,
    iterable,
  };
};

const invokeGens = <TGens extends Gens>(gs: TGens, seed: Seed, size: Size): GenInvocationsResult<TGens> => {
  const initial = {
    nextSeed: seed,
    iterables: [] as unknown[],
  } as GenInvocationsResult<TGens>;

  return gs.reduce((result, g) => {
    const { iterable, nextSeed } = invokeGen(g, seed, size);
    return {
      nextSeed,
      iterables: [...result.iterables, iterable] as IterableGenOutputs<TGens>,
    };
  }, initial);
};

const NOT_A_COUNTEREXAMPLE = Symbol();

const isCounterexample = <TGens extends Gens>(
  maybeCounterexample: PropertyCounterexample<TGens> | typeof NOT_A_COUNTEREXAMPLE,
): maybeCounterexample is PropertyCounterexample<TGens> => maybeCounterexample !== NOT_A_COUNTEREXAMPLE;

const tryFindCounterexample = <TGens extends Gens>(
  f: PropertyFunction<TGens>,
  g: GenInstanceData<any[]>,
): PropertyCounterexample<TGens> | typeof NOT_A_COUNTEREXAMPLE => {
  const unsafeF = f as any;

  const result = unsafeF(...g.value) as boolean;
  if (result) {
    return NOT_A_COUNTEREXAMPLE;
  }

  const countexampleValues = first(
    pipe(
      g.shrink(),
      map((gChild) => tryFindCounterexample(f, gChild)),
      filter(isCounterexample),
    ),
  );

  return {
    values: (countexampleValues || g.value) as GenValues<TGens>,
    shrinkPath: [],
  };
};

const runIteration = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  seed: Seed,
  size: Size,
): [PropertyIterationStatus, PropertyCounterexample<TGens> | null] => {
  const { iterables } = invokeGens(gs, seed, size);

  const statusAndCounterexample: [PropertyIterationStatus, PropertyCounterexample<TGens> | null] | undefined = first(
    pipe(
      zipSafe(...iterables),
      map((genResults: Array<GenResult<any>>): [PropertyIterationStatus, PropertyCounterexample<TGens> | null] => {
        if (genResults.every(GenResult.isInstance)) {
          const combinedInstances = GenInstance.join(...genResults);
          const counterexample = tryFindCounterexample(f, combinedInstances);
          return counterexample === NOT_A_COUNTEREXAMPLE ? ['success', null] : ['predicateFailure', counterexample];
        }

        return ['exhaustionFailure', null];
      }),
      take(1),
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

const runProperty = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  config: PropertyConfig,
): PropertyRunResult<TGens> => {
  const { iterations, seed, size } = config;

  const lastIteration = last(
    pipe(
      from(runIterations(gs, f, seed, size)),
      take(iterations),
      takeWhileInclusive((x) => x.iterationStatus === 'success'),
    ),
  );

  /* istanbul ignore next */
  if (lastIteration === undefined) {
    throw new Error('Unexpected: Could not attempt any iterations.');
  }

  return {
    lastIteration,
  };
};

export default runProperty;
