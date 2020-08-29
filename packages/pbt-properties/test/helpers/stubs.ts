import * as devCore from 'pbt-core';

namespace IterableStub {
  export const many = <T>(xs: T[]): Iterable<T> => xs.values();

  export const one = <T>(x: T): Iterable<T> => many([x]);

  export const none = <T>(): Iterable<T> => many([]);
}

export namespace GenStub {
  export const empty = <T>(): devCore.Gen<T> => () => IterableStub.none();

  export const exhaustAfter = <T>(xs: T[]): devCore.Gen<T> => () => {
    const instances: Array<devCore.GenInstance<T>> = xs.map((x) => ({
      kind: 'instance',
      shrink: () => IterableStub.none(),
      value: x,
    }));

    const exhaused: devCore.GenExhaustion = {
      kind: 'exhaustion',
    };

    return IterableStub.many<devCore.GenResult<T>>([...instances, exhaused]);
  };

  export const singleton = <T>(x: T): devCore.Gen<T> => exhaustAfter([x]);

  export const exhausted = <T>(): devCore.Gen<T> => exhaustAfter([]);
}
