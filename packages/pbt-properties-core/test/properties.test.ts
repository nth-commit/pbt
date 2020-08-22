import * as fc from 'fast-check';
import { Gen } from 'pbt-generator-core';
import { property } from '../src';

namespace MockIterable {
  export const many = <T>(xs: T[]): Iterable<T> => xs.values();

  export const one = <T>(x: T): Iterable<T> => many([x]);

  export const none = <T>(): Iterable<T> => many([]);
}

namespace MockGen {
  export const returns = <T>(x: T): Gen<T> => () =>
    MockIterable.one({
      shrink: () => MockIterable.none(),
      value: x,
    });
}

test('The test function receives a value from the generator', () => {
  fc.assert(
    fc.property(fc.anything(), fc.boolean(), (x, b) => {
      const f = jest.fn<boolean, unknown[]>(() => b);
      const p = property(MockGen.returns(x), f);

      p();

      expect(f).toBeCalledWith(x);
    }),
  );
});
