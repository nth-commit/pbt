import * as fc from 'fast-check';
import { property } from '../src';
import { arbitraryGenValue, arbitraryPredicate, arbitraryPropertyFixture } from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  fc.assert(
    fc.property(arbitraryPredicate(), arbitraryGenValue(), (f, x) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.singleton(x), spyF);

      p(1);

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('Given a true predicate, the property holds', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), ({ values, iterations }) => {
      const f = () => true;
      const p = property(GenStub.fromArray(values), f);

      const result = p(iterations);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), ({ values, iterations }) => {
      const f = () => false;
      const p = property(GenStub.fromArray(values), f);

      const result = p(iterations);

      expect(result).toEqual({ kind: 'failure' });
    }),
  );
});
