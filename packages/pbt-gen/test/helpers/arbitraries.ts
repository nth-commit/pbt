import { createHash } from 'crypto';
import fc from 'fast-check';
import { mersenne } from 'pure-rand';
import * as devCore from 'pbt-core';
import * as dev from '../../src';

export const arbitrarySeed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create).noShrink();

export const arbitrarySize = (): fc.Arbitrary<devCore.Size> =>
  fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export type GenParams = {
  seed: devCore.Seed;
  size: devCore.Size;
};

export const arbitraryGenParams = (): fc.Arbitrary<GenParams> =>
  fc.tuple(arbitrarySeed(), arbitrarySize()).map(([seed, size]) => ({ seed, size }));

export const arbitraryInteger = (): fc.Arbitrary<number> => fc.integer(-1000, 1000);

export const arbitraryNaturalNumber = (): fc.Arbitrary<number> => fc.nat(1000);

export const arbitraryIterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

const getHexRepresentation = (x: unknown): string => {
  const json = JSON.stringify(x);
  const hash = createHash('sha256');
  hash.update(json, 'utf8');
  return hash.digest('hex');
};

export const arbitraryFunction = <T>(
  arbitraryReturn: fc.Arbitrary<T>,
  arity?: number,
): fc.Arbitrary<(...args: any[]) => T> => {
  const arityFormatted = arity === undefined ? 'n' : arity;

  return fc
    .nat()
    .noBias()
    .map((n) => {
      const f = (...args: any[]): T => {
        const hashArgs = arity === undefined ? args : args.slice(0, arity);
        const m = Number(getHexRepresentation(hashArgs).replace(/[a-f]/gi, '').slice(0, 10));
        const seed = n + m;
        return arbitraryReturn.generate(new fc.Random(mersenne(seed))).value;
      };

      f.toString = () => `function:${arityFormatted}`;

      return f;
    });
};

export const arbitraryPredicate = (arity?: number): fc.Arbitrary<(...args: any[]) => boolean> =>
  arbitraryFunction(fc.boolean(), arity);

type GeneratorName =
  | 'integer.unscaled'
  | 'integer.scaleLinearly'
  | 'naturalNumber.unscaled'
  | 'naturalNumber.scaleLinearly';

const generators: Record<GeneratorName, dev.Gen<unknown>> = {
  'integer.unscaled': dev.integer.unscaled(0, 10) as dev.Gen<unknown>,
  'integer.scaleLinearly': dev.integer.scaleLinearly(0, 10) as dev.Gen<unknown>,
  'naturalNumber.unscaled': dev.naturalNumber.unscaled(10) as dev.Gen<unknown>,
  'naturalNumber.scaleLinearly': dev.naturalNumber.scaleLinearly(10) as dev.Gen<unknown>,
};

export const arbitraryFullGenerator = (): fc.Arbitrary<dev.Gen<unknown>> => {
  const augmentGenToString = <T>(g: dev.Gen<T>, key: string): dev.Gen<T> => {
    g.toString = () => `generator:${key}`;
    return g;
  };

  return fc.constantFrom(...(Object.keys(generators) as Array<keyof typeof generators>)).map((key) => {
    const g = generators[key];
    return augmentGenToString(g, key);
  });
};

export const arbitraryGenerator = (): fc.Arbitrary<dev.Gen<unknown>> => {
  const augmentGenToString = <T>(g: dev.Gen<T>, key: string): dev.Gen<T> => {
    g.toString = () => `generator:${key}`;
    return g;
  };

  return fc.constantFrom(...(Object.keys(generators) as Array<keyof typeof generators>)).chain((key) => {
    const g = generators[key];
    return fc
      .frequency(
        { weight: 4, arbitrary: fc.constant(g) },
        { weight: 1, arbitrary: arbitraryPredicate(1).map((pred) => g.filter(pred)) },
      )
      .map((g) => augmentGenToString(g, key));
  });
};
