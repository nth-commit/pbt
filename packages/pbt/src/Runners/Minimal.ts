import { Size } from '../Core';
import { Gen } from '../Gen';
import { property } from '../Property';
import { check } from './Check';
import { getDefaultConfig } from './DefaultConfig';

export type MinimalConfig = {
  seed: number;
  size: Size | undefined;
  iterations: number;
};

type MinimalArgs<T> =
  | [Gen<T>]
  | [Gen<T>, Partial<MinimalConfig>]
  | [Gen<T>, (x: T) => boolean]
  | [Gen<T>, (x: T) => boolean, Partial<MinimalConfig>];

export function minimalValue<T>(g: Gen<T>): T;
export function minimalValue<T>(g: Gen<T>, config: Partial<MinimalConfig>): T;
export function minimalValue<T>(g: Gen<T>, predicate: (x: T) => boolean): T;
export function minimalValue<T>(g: Gen<T>, predicate: (x: T) => boolean, config: Partial<MinimalConfig>): T;
export function minimalValue<T>(...args: MinimalArgs<T>): T {
  return minimalInternal(args).value;
}

export type MinimalResult<T> = {
  value: T;
  shrinks: T[];
  seed: number;
  size: Size;
};

export function minimal<T>(g: Gen<T>): MinimalResult<T>;
export function minimal<T>(g: Gen<T>, config: Partial<MinimalConfig>): MinimalResult<T>;
export function minimal<T>(g: Gen<T>, predicate: (x: T) => boolean): MinimalResult<T>;
export function minimal<T>(g: Gen<T>, predicate: (x: T) => boolean, config: Partial<MinimalConfig>): MinimalResult<T>;
export function minimal<T>(...args: MinimalArgs<T>): MinimalResult<T> {
  return minimalInternal(args);
}

const minimalInternal = <T>(args: MinimalArgs<T>): MinimalResult<T> => {
  const [g, predicateOrUndefined, configOrUndefined] = normalizeArgs(args);
  const predicate = predicateOrUndefined || (() => true);
  const config: MinimalConfig = {
    size: undefined,
    ...getDefaultConfig(),
    ...(configOrUndefined || {}),
  };

  const p = property(g, (x) => !predicate(x));
  const c = check(p, config);

  if (c.kind !== 'falsified') {
    throw new Error('Unable to find counterexample');
  }

  return {
    value: c.counterexample.value[0],
    seed: c.seed,
    size: c.size,
    shrinks: c.shrinks.map((value) => value[0]),
  };
};

const normalizeArgs = <T>(
  args: MinimalArgs<T>,
): [Gen<T>, ((x: T) => boolean) | undefined, Partial<MinimalConfig> | undefined] => {
  switch (args.length) {
    case 1:
      return [args[0], undefined, undefined];
    case 2:
      return typeof args[1] === 'function' ? [args[0], args[1], undefined] : [args[0], undefined, args[1]];
    case 3:
      return args;
  }
};
