import fc from 'fast-check';
import { createHash } from 'crypto';
import { mersenne } from 'pure-rand';
import * as dev from '../../../src/Gen';
import { Gens, Gens_FirstOrder } from '../Gen.Spec';

export type GenRunParams = {
  seed: dev.Seed;
  size: dev.Size;
  iterations: number;
};

export const seed = (): fc.Arbitrary<dev.Seed> => fc.nat().map(dev.Seed.create).noShrink();

export const size = (): fc.Arbitrary<dev.Size> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const iterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

export const runParams = (): fc.Arbitrary<GenRunParams> =>
  fc.tuple(seed(), size(), iterations()).map(([seed, size, iterations]) => ({ seed, size, iterations }));

export const integer = (): fc.Arbitrary<number> => fc.integer(-1000, 1000);

export const negativeInteger = (): fc.Arbitrary<number> =>
  naturalNumber()
    .filter((x) => x > 0)
    .map((x) => -x);

export const naturalNumber = (): fc.Arbitrary<number> => fc.nat(1000);

export const element = <T>(collection: Record<any, T>): fc.Arbitrary<T> => {
  const elements = Object.values(collection);
  return fc.constantFrom(...elements);
};

const getHexRepresentation = (x: unknown): string => {
  const json = JSON.stringify(x);
  const hash = createHash('sha256');
  hash.update(json, 'utf8');
  return hash.digest('hex');
};

export type FunctionConstraints = {
  arity?: number;
};

export const func = <T, TArgs extends any[] = unknown[]>(
  genReturn: fc.Arbitrary<T>,
  constraints: FunctionConstraints = {},
): fc.Arbitrary<(...args: TArgs) => T> => {
  const arityFormatted = constraints.arity === undefined ? 'n' : constraints.arity;

  return fc
    .nat()
    .noBias()
    .map((n) => {
      const f = (...args: TArgs): T => {
        const hashArgs = constraints.arity === undefined ? args : args.slice(0, constraints.arity);
        const m = Number(getHexRepresentation(hashArgs).replace(/[a-f]/gi, '').slice(0, 10));
        const seed = n + m;
        return genReturn.generate(new fc.Random(mersenne(seed))).value;
      };

      f.toString = () => `function:${arityFormatted}`;

      return f;
    });
};

export const predicate = <TArgs extends any[] = unknown[]>(
  constraints?: FunctionConstraints,
): fc.Arbitrary<(...args: TArgs) => boolean> => func<boolean, TArgs>(fc.boolean(), constraints);

export namespace defaultGens {
  export const integerUnscaled = (): fc.Arbitrary<dev.Gen<number>> =>
    fc.tuple(integer(), integer()).map((args) => dev.integer.unscaled(...args));

  export const integerScaledLinearly = (): fc.Arbitrary<dev.Gen<number>> =>
    fc.tuple(integer(), integer()).map((args) => dev.integer.unscaled(...args));

  export const naturalNumberUnscaled = (): fc.Arbitrary<dev.Gen<number>> =>
    naturalNumber().map((max) => dev.naturalNumber.unscaled(max));

  export const naturalNumberScaledLinearly = (): fc.Arbitrary<dev.Gen<number>> =>
    naturalNumber().map((max) => dev.naturalNumber.scaleLinearly(max));

  export const noShrinkGen = (): fc.Arbitrary<dev.Gen<unknown>> => firstOrderGen().map(dev.operators.noShrink);

  export const filterGen = (): fc.Arbitrary<dev.Gen<unknown>> =>
    fc.tuple(firstOrderGen(), predicate()).map(([gen, predicate]) => dev.operators.filter(gen, predicate));
}

export const firstOrderGen = (): fc.Arbitrary<dev.Gen<unknown>> => {
  type GensByLabel = { [P in Gens_FirstOrder]: fc.Arbitrary<dev.Gen<unknown>> };

  const gensByLabel: GensByLabel = {
    'integer.unscaled': defaultGens.integerUnscaled(),
    'integer.scaleLinearly': defaultGens.integerScaledLinearly(),
    'naturalNumber.unscaled': defaultGens.integerUnscaled(),
    'naturalNumber.scaleLinearly': defaultGens.naturalNumberScaledLinearly(),
  };

  return element(gensByLabel).chain((x) => x);
};

export const gen = (): fc.Arbitrary<dev.Gen<unknown>> => {
  type GensByLabel = { [P in Gens]: fc.Arbitrary<dev.Gen<unknown>> };

  const gensByLabel: GensByLabel = {
    'integer.unscaled': defaultGens.integerUnscaled(),
    'integer.scaleLinearly': defaultGens.integerScaledLinearly(),
    'naturalNumber.unscaled': defaultGens.integerUnscaled(),
    'naturalNumber.scaleLinearly': defaultGens.naturalNumberScaledLinearly(),
    'operators.noShrink': defaultGens.noShrinkGen(),
    'operators.filter': defaultGens.filterGen(),
  };

  return element(gensByLabel).chain((x) => x);
};
