import fc from 'fast-check';
import { createHash } from 'crypto';
import { mersenne } from 'pure-rand';
import { empty } from 'ix/iterable';

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
        const m = Number(getHexRepresentation(hashArgs).replace(/[a-f]/gi, '').slice(0, 10));
        const seed = n + m;
        return genReturn.generate(new fc.Random(mersenne(seed))).value;
      };

      f.toString = () => `function:${arityFormatted}`;

      return f;
    });
};
