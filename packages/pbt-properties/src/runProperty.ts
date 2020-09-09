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

export type PropertyIterationResult<TGens extends Gens> = {
  iterationStatus: 'success' | 'predicateFailure' | 'exhaustionFailure';
  iterationNumber: number;
  minimalCounterexample: GenValues<TGens>;
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

const tryFindMinimalCounterexample = <TGens extends Gens>(
  f: PropertyFunction<TGens>,
  g: GenInstanceData<any[]>,
): any[] | typeof NOT_A_COUNTEREXAMPLE => {
  const unsafeF = f as any;

  const result = unsafeF(...g.value) as boolean;
  if (result) {
    return NOT_A_COUNTEREXAMPLE;
  }

  const minimalCountexampleValues = first(
    pipe(
      g.shrink(),
      map((gChild) => tryFindMinimalCounterexample(f, gChild)),
      filter((x) => x !== NOT_A_COUNTEREXAMPLE),
    ),
  );

  return minimalCountexampleValues || g.value;
};

const runIteration = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  seed: Seed,
  size: Size,
): [PropertyIterationStatus, any[]] => {
  const { iterables } = invokeGens(gs, seed, size);

  const statusAndCounterexample: [PropertyIterationStatus, any[]] | undefined = first(
    pipe(
      zipSafe(...iterables),
      map((genResults: Array<GenResult<any>>): [PropertyIterationStatus, any[]] => {
        if (genResults.every(GenResult.isInstance)) {
          const combinedInstances = GenInstance.join(...genResults);
          const minimalCounterexample = tryFindMinimalCounterexample(f, combinedInstances);
          return minimalCounterexample === NOT_A_COUNTEREXAMPLE
            ? ['success', []]
            : ['predicateFailure', minimalCounterexample];
        }

        return ['exhaustionFailure', []];
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
  intialSize: Size,
): Iterable<PropertyIterationResult<TGens>> {
  for (let iterationNumber = 1; iterationNumber <= Number.MAX_SAFE_INTEGER; iterationNumber++) {
    const iterationSizeOffset = iterationNumber - 1;
    const untruncatedSize = intialSize + iterationSizeOffset;
    const currentSize = ((untruncatedSize - 1) % 100) + 1;

    const [iterationStatus, minimalCounterexample] = runIteration(gs, f, initialSeed, currentSize);

    yield {
      iterationNumber,
      iterationStatus,
      minimalCounterexample: minimalCounterexample as any,
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
