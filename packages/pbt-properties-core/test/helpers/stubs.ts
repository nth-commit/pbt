import { Gen, GenExhaustion, GenInstance, GenResult } from 'pbt-generator-core';

namespace IterableStub {
  export const many = <T>(xs: T[]): Iterable<T> => xs.values();

  export const one = <T>(x: T): Iterable<T> => many([x]);

  export const none = <T>(): Iterable<T> => many([]);
}

export namespace GenStub {
  export const empty = <T>(): Gen<T> => () => IterableStub.none();

  export const singleton = <T>(x: T): Gen<T> => () =>
    IterableStub.one<GenInstance<T>>({
      kind: 'instance',
      shrink: () => IterableStub.none(),
      value: x,
    });

  export const fromArray = <T>(xs: T[]): Gen<T> => () =>
    IterableStub.many<GenInstance<T>>(
      xs.map(x => ({
        kind: 'instance',
        shrink: () => IterableStub.none(),
        value: x,
      })),
    );

  export const exhausted = <T>(): Gen<T> => () =>
    IterableStub.one<GenExhaustion>({
      kind: 'exhaustion',
    });

  export const exhaustAfter = <T>(xs: T[]): Gen<T> => () => {
    const instances: Array<GenInstance<T>> = xs.map(x => ({
      kind: 'instance',
      shrink: () => IterableStub.none(),
      value: x,
    }));

    const exhaused: GenExhaustion = {
      kind: 'exhaustion',
    };

    return IterableStub.many<GenResult<T>>([...instances, exhaused]);
  };
}
