import fc from 'fast-check';
import { createHash } from 'crypto';
import { mersenne } from 'pure-rand';
import * as dev from '../../src/Public';

export type FunctionConstraints = {
  arity?: number;
};

const getHexRepresentation = (x: unknown): string => {
  const json = JSON.stringify(x);
  const hash = createHash('sha256');
  hash.update(json, 'utf8');
  return hash.digest('hex');
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
        const m = parseInt(getHexRepresentation(hashArgs), 16);
        const seed = n + m;
        return genReturn.generate(new fc.Random(mersenne(seed))).value;
      };

      f.toString = () => `function:${arityFormatted}`;

      return f;
    });
};

export const gen = (): fc.Arbitrary<dev.Gen<unknown>> => fc.constant(dev.gen.naturalNumber.unscaled(10));

export const gens = (): fc.Arbitrary<dev.Gen<unknown>[]> => fc.array(gen(), 0, 10);

export const infallibleFunc = (): fc.Arbitrary<dev.PropertyFunction<unknown[]>> =>
  fc.constantFrom(
    () => true,
    () => {},
  );

export const fallibleFunc = (): fc.Arbitrary<dev.PropertyFunction<unknown[]>> =>
  func(
    fc
      .frequency(
        {
          weight: 2,
          arbitrary: fc.constant(true),
        },
        {
          weight: 1,
          arbitrary: fc.constant(false),
        },
      )
      .noBias(),
  );
