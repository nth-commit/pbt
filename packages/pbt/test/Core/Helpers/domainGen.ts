import * as stable from 'pbt';

export type AnyArray = any[];
export type AnyNonEmptyArray = [any, ...AnyArray];
export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

export const choose = <Ts extends AnyArray | AnyNonEmptyArray>(
  ...gens: Ts extends AnyNonEmptyArray ? { [P in keyof Ts]: stable.Gen<Ts[P]> } : stable.Gen<ArrayElement<Ts>>[]
): stable.Gen<ArrayElement<Ts>> => {
  const numberOfGens = gens.length;
  if (numberOfGens === 0) {
    throw new Error('Expected at least one gen');
  }

  return stable.Gen.integer()
    .between(0, numberOfGens)
    .flatMap((i) => gens[i]);
};

export const element = <T>(...elements: T[]): stable.Gen<T> => {
  const numberOfElements = elements.length;
  if (numberOfElements === 0) {
    throw new Error('Expected at least one element');
  }

  return stable.Gen.integer()
    .between(0, numberOfElements - 1)
    .map((i) => elements[i]);
};
