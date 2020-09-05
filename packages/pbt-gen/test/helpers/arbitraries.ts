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

export const arbitraryIterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

const getHexRepresentation = (x: unknown): string => {
  const json = JSON.stringify(x);
  const hash = createHash('sha256');
  hash.update(json, 'utf8');
  return hash.digest('hex');
};

export const arbitraryFunction = <T>(arbitraryReturn: fc.Arbitrary<T>): fc.Arbitrary<(...args: any[]) => T> =>
  fc
    .nat()
    .noBias()
    .map((n) => (...args: any[]): T => {
      const m = Number(getHexRepresentation(args).replace(/[a-f]/gi, '').slice(0, 10));
      const seed = n + m;
      return arbitraryReturn.generate(new fc.Random(mersenne(seed))).value;
    });

const generators = {
  'integer.constant': dev.integer.constant(0, 10),
  'integer.linear': dev.integer.linear(0, 10),
};

export const arbitraryGenerator = (): fc.Arbitrary<dev.Gen<unknown>> =>
  fc.constantFrom(...(Object.keys(generators) as Array<keyof typeof generators>)).map((key) => {
    const g = generators[key];
    g.toString = () => `generator:${key}`;
    return g;
  });
