import { Gen, Gens, GenResult, GenInstance, Seed, Size } from 'pbt-core';
import { pipe, last, zip, concat, from, first } from 'ix/iterable';
import { map, take } from 'ix/iterable/operators';
import { takeWhileInclusive } from './iterableOperators';
import { PropertyConfig } from './PropertyConfig';

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

type GenOutput<T> = T extends Gen<infer U> ? GenResult<U> : never;

type IterableGenOutputs<TGens extends Gens> = { [P in keyof TGens]: Iterable<GenOutput<TGens[P]>> };

export type PropertyFunction<TGens extends Gens> = (...args: GenValues<TGens>) => boolean;

export type PropertyIterationStatus = 'success' | 'predicateFailure' | 'exhaustionFailure';

export type PropertyIterationResult = {
  iterationStatus: 'success' | 'predicateFailure' | 'exhaustionFailure';
  iterationNumber: number;
};

export type PropertyRunResult = {
  lastIteration: PropertyIterationResult;
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

const tryInvokePropertyFunction = <TGens extends Gens>(
  f: PropertyFunction<TGens>,
  args: Array<GenResult<any>>,
): PropertyIterationStatus => {
  if (args.every(GenResult.isInstance)) {
    const unsafeF = f as any;
    const unsafeValues = args.map((x) => x.value);
    return (unsafeF(...unsafeValues) as boolean) ? 'success' : 'predicateFailure';
  }
  return 'exhaustionFailure';
};

const runIteration = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  seed: Seed,
  size: Size,
): PropertyIterationStatus => {
  const { iterables } = invokeGens(gs, seed, size);

  const status = first(
    pipe(
      zip(...iterables),
      map((genResults: Array<GenResult<any>>) => tryInvokePropertyFunction(f, genResults)),
      take(1),
    ),
  );

  /* istanbul ignore next */
  if (!status) {
    throw new Error('Fatal: Failed to run iteration');
  }

  return status;
};

const runIterations = function* <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  initialSeed: Seed,
  intialSize: Size,
): Iterable<PropertyIterationResult> {
  for (let iterationNumber = 1; iterationNumber <= Number.MAX_SAFE_INTEGER; iterationNumber++) {
    const iterationSizeOffset = iterationNumber - 1;
    const untruncatedSize = intialSize + iterationSizeOffset;
    const currentSize = ((untruncatedSize - 1) % 100) + 1;
    yield {
      iterationNumber,
      iterationStatus: runIteration(gs, f, initialSeed, currentSize),
    };
  }
};

const runProperty = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
  config: PropertyConfig,
): PropertyRunResult => {
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
