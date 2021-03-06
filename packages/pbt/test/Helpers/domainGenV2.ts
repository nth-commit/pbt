import { Gen } from 'pbt';

export namespace DomainGenV2 {
  export const anything = (): Gen<unknown> => choose<unknown>(Gen.constant({}), Gen.integer(), Gen.float());

  export const seed = (): Gen<number> => Gen.integer().noBias().noShrink();

  export const size = (): Gen<number> => Gen.integer().between(0, 99);

  export const choose = <T>(...gens: Gen<T>[]): Gen<T> => {
    const numberOfGens = gens.length;
    if (numberOfGens === 0) {
      throw new Error('Expected at least one gen');
    }

    return Gen.integer()
      .between(0, numberOfGens - 1)
      .noBias()
      .flatMap((i) => gens[i]);
  };
}
