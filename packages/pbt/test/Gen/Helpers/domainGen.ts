import fc from 'fast-check';
import { createHash } from 'crypto';
import { mersenne } from 'pure-rand';
import * as dev from '../../../src/Gen';
import { Gens, Gens_FirstOrder } from '../Gen.Spec';
import { empty } from 'ix/iterable';

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

export const integer = (min: number, max: number): fc.Arbitrary<number> => fc.integer(min, max);

export const negativeInteger = (): fc.Arbitrary<number> =>
  naturalNumber()
    .filter((x) => x > 0)
    .map((x) => -x);

export const naturalNumber = (max: number = 1000): fc.Arbitrary<number> => fc.nat(max);

export const element = <T>(collection: Record<any, T>): fc.Arbitrary<T> => {
  const elements = Object.values(collection);
  return fc.constantFrom(...elements);
};

export const record = <Key extends string, Value>(
  keyGen: fc.Arbitrary<Key>,
  valueGen: fc.Arbitrary<Value>,
  minLength: number,
  maxLength: number,
): fc.Arbitrary<Record<Key, Value>> => {
  const arbitraryKvp = fc.tuple(keyGen, valueGen);
  return fc.array(arbitraryKvp, minLength, maxLength).map((kvps) =>
    kvps.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as Record<Key, Value>),
  );
};

export const map = <Key, Value>(
  keyGen: fc.Arbitrary<Key>,
  valueGen: fc.Arbitrary<Value>,
  minLength: number,
  maxLength: number,
): fc.Arbitrary<Map<Key, Value>> =>
  fc.array(fc.tuple(keyGen, valueGen), minLength, maxLength).map((entries) => new Map(entries));

export const set = <Value>(
  elementGen: fc.Arbitrary<Value>,
  minLength: number,
  maxLength: number,
): fc.Arbitrary<Set<Value>> => fc.set(elementGen, minLength, maxLength).map((s) => new Set(s));

export const iterable = (minLength: number, maxLength: number) =>
  fc.oneof(
    fc.array(fc.anything(), minLength, maxLength),
    fc.set(fc.anything(), minLength, maxLength).map((x) => new Set(x)),
    fc.array(fc.tuple(fc.anything(), fc.anything()), minLength, maxLength).map((entries) => new Map(entries)),
  );

export const collection = (minLength: number, maxLength: number) =>
  fc.oneof(
    fc.array(fc.anything(), minLength, maxLength),
    record(fc.string(), fc.anything(), minLength, maxLength),
    fc.set(fc.anything(), minLength, maxLength).map((x) => new Set(x)),
    fc.array(fc.tuple(fc.anything(), fc.anything()), minLength, maxLength).map((entries) => new Map(entries)),
  );

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
    fc.tuple(integer(-1000, 1000), integer(-1000, 1000)).map((args) => dev.integer.unscaled(...args));

  export const integerScaledLinearly = (): fc.Arbitrary<dev.Gen<number>> =>
    fc.tuple(integer(-1000, 1000), integer(-1000, 1000)).map((args) => dev.integer.unscaled(...args));

  export const naturalNumberUnscaled = (): fc.Arbitrary<dev.Gen<number>> =>
    naturalNumber().map((max) => dev.naturalNumber.unscaled(max));

  export const naturalNumberScaledLinearly = (): fc.Arbitrary<dev.Gen<number>> =>
    naturalNumber().map((max) => dev.naturalNumber.scaleLinearly(max));

  export const arrayUnscaled = (): fc.Arbitrary<dev.Gen<unknown[]>> =>
    fc.tuple(naturalNumber(10), naturalNumber(10)).map((args) => dev.array.unscaled(...args, dev.constant({})));

  export const arrayScaledLinearly = (): fc.Arbitrary<dev.Gen<unknown[]>> =>
    fc.tuple(naturalNumber(10), naturalNumber(10)).map((args) => dev.array.unscaled(...args, dev.constant({})));

  export const element = (): fc.Arbitrary<dev.Gen<unknown>> =>
    collection(1, 10).map((collection) => dev.element(collection));

  export const map = (): fc.Arbitrary<dev.Gen<unknown>> =>
    fc.tuple(firstOrderGen(), func(fc.anything())).map(([gen, f]) => dev.operators.map(gen, f));

  export const flatMap = (): fc.Arbitrary<dev.Gen<unknown>> =>
    fc.tuple(firstOrderGen(), func(firstOrderGen())).map(([gen, k]) => dev.operators.flatMap(gen, k));

  export const filter = (): fc.Arbitrary<dev.Gen<unknown>> =>
    fc.tuple(firstOrderGen(), predicate()).map(([gen, predicate]) => dev.operators.filter(gen, predicate));

  export const reduce = (): fc.Arbitrary<dev.Gen<unknown>> =>
    fc
      .tuple(firstOrderGen(), fc.integer(1, 10), func(fc.anything(), { arity: 2 }), fc.anything())
      .map(([gen, length, f, init]) => dev.operators.reduce(gen, length, f, init));

  export const noShrink = (): fc.Arbitrary<dev.Gen<unknown>> => firstOrderGen().map(dev.operators.noShrink);

  export const postShrink = (): fc.Arbitrary<dev.Gen<unknown>> =>
    firstOrderGen().map((gen) => dev.operators.postShrink(gen, empty));
}

export const firstOrderGen = (): fc.Arbitrary<dev.Gen<unknown>> => {
  type GensByLabel = { [P in Gens_FirstOrder]: fc.Arbitrary<dev.Gen<unknown>> };

  const gensByLabel: GensByLabel = {
    'integer.unscaled': defaultGens.integerUnscaled(),
    'integer.scaleLinearly': defaultGens.integerScaledLinearly(),
    'naturalNumber.unscaled': defaultGens.integerUnscaled(),
    'naturalNumber.scaleLinearly': defaultGens.naturalNumberScaledLinearly(),
    element: defaultGens.element(),
  };

  return element(gensByLabel).chain((x) => x);
};

export const gen = (): fc.Arbitrary<dev.Gen<unknown>> => {
  type GensByLabel = { [P in Gens]: fc.Arbitrary<dev.Gen<unknown>> };

  const gensByLabel: GensByLabel = {
    'integer.unscaled': defaultGens.integerUnscaled(),
    'integer.scaleLinearly': defaultGens.integerScaledLinearly(),
    'naturalNumber.unscaled': defaultGens.naturalNumberUnscaled(),
    'naturalNumber.scaleLinearly': defaultGens.naturalNumberScaledLinearly(),
    'array.unscaled': defaultGens.arrayUnscaled(),
    'array.scaleLinearly': defaultGens.arrayScaledLinearly(),
    element: defaultGens.element(),
    'operators.map': defaultGens.map(),
    'operators.flatMap': defaultGens.flatMap(),
    'operators.filter': defaultGens.filter(),
    'operators.reduce': defaultGens.reduce(),
    'operators.noShrink': defaultGens.noShrink(),
    'operators.postShrink': defaultGens.postShrink(),
  };

  return element(gensByLabel).chain((x) => x);
};
