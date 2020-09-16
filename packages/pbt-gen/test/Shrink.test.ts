import { Shrink } from '../src/Shrink';

test.each([
  { target: 0, value: 0, expectedShrinks: [] },
  { target: 0, value: 100, expectedShrinks: [0, 50, 75, 87, 93, 96, 98, 99] },
  { target: 0, value: 200, expectedShrinks: [0, 100, 150, 175, 187, 193, 196, 198, 199] },
  { target: 10, value: 100, expectedShrinks: [10, 55, 77, 88, 94, 97, 98, 99] },
  { target: -10, value: 100, expectedShrinks: [-10, 45, 72, 86, 93, 96, 98, 99] },
  { target: 0, value: -100, expectedShrinks: [0, -50, -75, -87, -93, -96, -98, -99] },
  { target: -10, value: 0, expectedShrinks: [-10, -5, -3, -2, -1] },
])('towardsNumber', ({ target, value, expectedShrinks }) => {
  const shrinker = Shrink.towardsNumber(target);

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});

test.each([
  { value: [], size: 0, expectedShrinks: [] },
  { value: [], size: 1, expectedShrinks: [] },
  { value: ['a'], size: 0, expectedShrinks: [] },
  { value: ['a', 'b'], size: 0, expectedShrinks: [] },
  { value: ['a', 'b'], size: 1, expectedShrinks: [['a'], ['b']] },
  { value: ['a', 'b', 'c'], size: 1, expectedShrinks: [['a'], ['b'], ['c']] },
  {
    value: ['a', 'b', 'c'],
    size: 2,
    expectedShrinks: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ],
  },
  {
    value: ['a', 'b', 'c', 'd'],
    size: 2,
    expectedShrinks: [
      ['a', 'b'],
      ['a', 'c'],
      ['a', 'd'],
      ['b', 'c'],
      ['b', 'd'],
      ['c', 'd'],
    ],
  },
  {
    value: ['a', 'b', 'c', 'd'],
    size: 3,
    expectedShrinks: [
      ['a', 'b', 'c'],
      ['a', 'b', 'd'],
      ['a', 'c', 'd'],
      ['b', 'c', 'd'],
    ],
  },
])('combinations', ({ value, size, expectedShrinks }) => {
  const shrinker = Shrink.combinations(size);

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});

test.each([
  { value: [], expectedShrinks: [] },
  { value: ['a'], expectedShrinks: [[]] },
  { value: ['a', 'b'], expectedShrinks: [[], ['a'], ['b']] },
  {
    value: ['a', 'b', 'c'],
    expectedShrinks: [[], ['a'], ['a', 'b'], ['b'], ['c'], ['a', 'c'], ['b', 'c']],
  },
])('array', ({ value, expectedShrinks }) => {
  const shrinker = Shrink.array();

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});
