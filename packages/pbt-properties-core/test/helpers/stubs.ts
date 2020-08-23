import { Gen } from 'pbt-generator-core';

namespace IterableStub {
  export const many = <T>(xs: T[]): Iterable<T> => xs.values();

  export const one = <T>(x: T): Iterable<T> => many([x]);

  export const none = <T>(): Iterable<T> => many([]);
}

export namespace GenStub {
  export const singleton = <T>(x: T): Gen<T> => () =>
    IterableStub.one({
      kind: 'instance',
      shrink: () => IterableStub.none(),
      value: x,
    });

  export const fromArray = <T>(xs: T[]): Gen<T> => () =>
    IterableStub.many(
      xs.map(x => ({
        kind: 'instance',
        shrink: () => IterableStub.none(),
        value: x,
      })),
    );
}
