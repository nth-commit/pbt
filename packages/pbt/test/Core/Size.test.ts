import { Gen } from 'pbt';
import * as dev from '../../src';
import * as domainGen from './Helpers/domainGen';

test.property('increments by one', Gen.integer().between(0, 98).noBias(), (initialSize) => {
  expect(dev.Size.increment(initialSize)).toEqual(initialSize + 1);
});

test.property('increments by ten, for a big increment', Gen.integer().between(0, 89).noBias(), (initialSize) => {
  expect(dev.Size.bigIncrement(initialSize)).toEqual(initialSize + 10);
});

test.property(
  'stays within the valid size range',
  Gen.integer().between(0, 99).noBias(),
  domainGen.element(dev.Size.increment, dev.Size.bigIncrement).array(),
  (initialSize, fs) => {
    const finalSize = fs.reduce((size, f) => f(size), initialSize);
    expect(finalSize).toBeLessThanOrEqual(99);
    expect(finalSize).toBeGreaterThanOrEqual(0);
  },
);
