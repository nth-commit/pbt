import { Gen } from 'pbt';

export type AnyArray = any[];
export type AnyNonEmptyArray = [any, ...AnyArray];
export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

export namespace DomainGenV2 {
  export const anything = (): Gen<unknown> => Gen.constant({});

  export const seed = (): Gen<number> => Gen.integer().growBy('constant').noShrink();

  export const size = (): Gen<number> => Gen.integer().between(0, 99);

  export type AnyArray = any[];
  export type AnyNonEmptyArray = [any, ...AnyArray];
  export type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

  export const choose = <Ts extends AnyArray | AnyNonEmptyArray>(
    ...gens: Ts extends AnyNonEmptyArray ? { [P in keyof Ts]: Gen<Ts[P]> } : Gen<ArrayElement<Ts>>[]
  ): Gen<ArrayElement<Ts>> => {
    const numberOfGens = gens.length;
    if (numberOfGens === 0) {
      throw new Error('Expected at least one gen');
    }

    return Gen.integer()
      .between(0, numberOfGens - 1)
      .growBy('constant')
      .flatMap((i) => gens[i]);
  };
}
