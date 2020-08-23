import * as fc from 'fast-check';
import { property } from '../src';
import { arbitraryGen, arbitraryPropertyFixture, arbitraryPropertyFunction } from './helpers/arbitraries';

test('The generator receives the seed', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), arbitraryGen(), arbitraryPropertyFunction(), (fixture, g, f) => {
      const spyGen = jest.fn(g);
      const p = property(spyGen, f);

      p(fixture);

      expect(spyGen).toBeCalledTimes(1);
      expect(spyGen).toBeCalledWith(fixture.seed, 0);
    }),
  );
});
