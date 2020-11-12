import { Size } from '../Core';
import { Gen } from '../Gen';
import { property } from '../Property';
import { check } from './Check';
import { getDefaultConfig } from './DefaultConfig';

export type MinimalConfig = {
  seed: number;
  size: Size;
  iterations: number;
};

type MinimalArgs<T> =
  | [Gen<T>]
  | [Gen<T>, Partial<MinimalConfig>]
  | [Gen<T>, (x: T) => boolean]
  | [Gen<T>, (x: T) => boolean, Partial<MinimalConfig>];

export function minimal<T>(g: Gen<T>): T;
export function minimal<T>(g: Gen<T>, config: Partial<MinimalConfig>): T;
export function minimal<T>(g: Gen<T>, predicate: (x: T) => boolean): T;
export function minimal<T>(g: Gen<T>, predicate: (x: T) => boolean, config: Partial<MinimalConfig>): T;
export function minimal<T>(...args: MinimalArgs<T>): T {
  const [g, predicateOrUndefined, configOrUndefined] = resolveArgs(args);
  const predicate = predicateOrUndefined || (() => true);
  const config: MinimalConfig = {
    ...getDefaultConfig({ size: 0 }),
    ...(configOrUndefined || {}),
  };

  const p = property(g, (x) => !predicate(x));
  const c = check(p, config);

  if (c.kind !== 'falsified') {
    throw new Error('Unable to find counterexample');
  }

  return c.counterexample.value[0];
}

const resolveArgs = <T>(
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
