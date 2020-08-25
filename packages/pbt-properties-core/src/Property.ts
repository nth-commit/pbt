import { Gen, GenResult, GenInstance, Seed, Size } from 'pbt-generator-core';
import { pipe, last, zip } from 'ix/iterable';
import { map, take } from 'ix/iterable/operators';
import { success, exhaustionFailure, predicateFailure, PropertyResult } from './PropertyResult';
import { indexed, mapIndexed, takeWhileInclusive } from './iterableOperators';
import { PropertyConfig, validateConfig } from './PropertyConfig';

type Gens = Array<Gen<any>>;

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

type GenOutput<T> = T extends Gen<infer U> ? GenResult<U> : never;

type IterableGenOutputs<TGens extends Gens> = { [P in keyof TGens]: Iterable<GenOutput<TGens[P]>> };

export interface Property<T> {
  (config: PropertyConfig): PropertyResult;
  _?: T;
}

export type PropertyFunction<TGens extends Gens> = (...args: GenValues<TGens>) => boolean;

type PropertyIterationResult = 'success' | 'predicateFailure' | 'exhaustionFailure';

type GenInvocationsResult<TGens extends Gens> = {
  nextSeed: Seed;
  iterables: IterableGenOutputs<TGens>;
};

const invokeGens = <TGens extends Gens>(gs: TGens, seed: Seed, size: Size): GenInvocationsResult<TGens> => {
  const initial = {
    nextSeed: seed,
    iterables: [] as unknown[],
  } as GenInvocationsResult<TGens>;

  return gs.reduce((result, g) => {
    const [leftSeed, rightSeed] = seed.split();
    const iterable = g(leftSeed, size);
    return {
      nextSeed: rightSeed,
      iterables: [...result.iterables, iterable] as IterableGenOutputs<TGens>,
    };
  }, initial);
};

const isGenResultAnInstance = <T>(r: GenResult<T>): r is GenInstance<T> => r.kind === 'instance';

const constantProperty = (f: PropertyFunction<[]>): Property<[]> => config => {
  const validationError = validateConfig(config);
  if (validationError) return validationError;

  // It's kinda meaningless to repeat a constant property, but we do so for API symmetry.
  for (let i = 0; i < config.iterations; i++) {
    if (f() === false) {
      return predicateFailure();
    }
  }

  return success();
};

const variadicProperty = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
): Property<GenValues<TGens>> => config => {
  const validationError = validateConfig(config);
  if (validationError) return validationError;

  const { iterations, seed } = config;

  const { iterables } = invokeGens(gs, seed, 0);

  const lastIteration = last(
    pipe(
      zip(...iterables),
      indexed(),
      take(iterations),
      mapIndexed(
        (genResults: Array<GenResult<any>>): PropertyIterationResult => {
          if (genResults.every(isGenResultAnInstance)) {
            const unsafeF = f as any;
            const unsafeValues = genResults.map(x => x.value);
            return (unsafeF(...unsafeValues) as boolean) ? 'success' : 'predicateFailure';
          }
          return 'exhaustionFailure';
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

export const property = <TGens extends Gens>(
  ...args: [...TGens, PropertyFunction<TGens>]
): Property<GenValues<TGens>> => {
  const gs = args.slice(0, args.length - 1) as TGens;
  const f = args[args.length - 1] as PropertyFunction<TGens>;

  return gs.length === 0 ? ((constantProperty(f) as unknown) as Property<GenValues<TGens>>) : variadicProperty(gs, f);
};
