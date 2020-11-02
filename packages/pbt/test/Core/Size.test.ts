import { assert, property, Gen } from 'pbt-vnext';
import * as dev from '../../src';
import * as domainGen from './Helpers/domainGen';

it('increments by one', () => {
  assert(
    property(Gen.integer().between(0, 98).growBy('constant'), (initialSize) => {
      expect(dev.Size.increment(initialSize)).toEqual(initialSize + 1);
    }),
  );
});

it('increments by ten, for a big increment', () => {
  assert(
    property(Gen.integer().between(0, 89).growBy('constant'), (initialSize) => {
      expect(dev.Size.bigIncrement(initialSize)).toEqual(initialSize + 10);
    }),
  );
});

it('stays within the valid size range', () => {
  assert(
    property(
      Gen.integer().between(0, 99).growBy('constant'),
      domainGen.element(dev.Size.increment, dev.Size.bigIncrement).array(),
      (initialSize, fs) => {
        const finalSize = fs.reduce((size, f) => f(size), initialSize);
        expect(finalSize).toBeLessThanOrEqual(99);
        expect(finalSize).toBeGreaterThanOrEqual(0);
      },
    ),
  );
});
