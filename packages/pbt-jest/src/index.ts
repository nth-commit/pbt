import 'jest';
import { property, assert, PropertyFunction, Gen, AssertConfig } from 'pbt';

type Gens<Ts extends any[]> = { [P in keyof Ts]: Gen<Ts[P]> };

type NullaryPropertyArgs = [propertyName: string, f: PropertyFunction<[]>];

type VariadicPropertyArgs<Ts extends [any, ...any[]]> = [
  propertyName: string,
  ...gens: Gens<Ts>,
  f: PropertyFunction<Ts>,
];

type Configurable = {
  config(config: Partial<AssertConfig>): void;
};

declare global {
  namespace jest {
    interface It {
      property(...args: NullaryPropertyArgs): Configurable;
      property<Ts extends [any, ...any[]]>(...args: VariadicPropertyArgs<Ts>): Configurable;
    }
  }
}

export const bind = (itLike: typeof it) => (...args: NullaryPropertyArgs | VariadicPropertyArgs<any>): Configurable => {
  const [propertyName, ...rest] = args;

  let config: Partial<AssertConfig> | undefined = undefined;

  itLike(propertyName, () => {
    const gens = rest.slice(0, rest.length - 1) as Gens<any[]>;
    const f = rest.slice(rest.length - 1, rest.length)[0] as PropertyFunction<any>;
    const p = property(...gens, f);
    return assert(p, config);
  });

  return {
    config: (c) => {
      config = c;
    },
  };
};

it.property = bind(it);
it.skip.property = bind(it.skip);
it.only.property = bind(it.only);
it.todo.property = bind(it.todo);
it.concurrent.property = bind(it.concurrent);
