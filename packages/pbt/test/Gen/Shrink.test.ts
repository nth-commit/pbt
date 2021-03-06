import * as dev from '../../src';
import { nativeCalculator } from '../../src/Number';

test.each([
  { value: 0, target: 0, expectedShrinks: [] },
  { value: 100, target: 0, expectedShrinks: [0, 50, 75, 87, 93, 96, 98, 99] },
  { value: 200, target: 0, expectedShrinks: [0, 100, 150, 175, 187, 193, 196, 198, 199] },
  { value: 100, target: 10, expectedShrinks: [10, 55, 77, 88, 94, 97, 98, 99] },
  { value: 100, target: -10, expectedShrinks: [-10, 45, 72, 86, 93, 96, 98, 99] },
  { value: -100, target: 0, expectedShrinks: [0, -50, -75, -87, -93, -96, -98, -99] },
  { value: 0, target: -10, expectedShrinks: [-10, -5, -3, -2, -1] },
])('towardsNumber', ({ value, target, expectedShrinks }) => {
  const shrinker = dev.Shrink.towardsNumber(nativeCalculator, nativeCalculator.loadIntegerUnchecked(target));

  const shrinks = Array.from(shrinker(nativeCalculator.loadIntegerUnchecked(value))).map(
    nativeCalculator.unloadInteger,
  );

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
  const shrinker = dev.Shrink.combinations(size);

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});

test.each([
  { value: [], targetLength: 0, expectedShrinks: [] },
  { value: ['a'], targetLength: 0, expectedShrinks: [[]] },
  { value: ['a', 'b'], targetLength: 0, expectedShrinks: [[], ['a'], ['b']] },
  { value: ['a', 'b'], targetLength: 1, expectedShrinks: [['a'], ['b']] },
  {
    value: ['a', 'b', 'c'],
    targetLength: 0,
    expectedShrinks: [[], ['a'], ['a', 'b'], ['b'], ['c'], ['a', 'c'], ['b', 'c']],
  },
  {
    value: ['a', 'b', 'c'],
    targetLength: 2,
    expectedShrinks: [
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
    ],
  },
])('array', ({ value, targetLength, expectedShrinks }) => {
  const shrinker = dev.Shrink.array(targetLength);

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});

test.each([
  {
    value: ['c', 'b', 'a'],
    targetLength: 0,
    expectedShrinks: [
      ['a', 'b', 'c'],
      [],
      ['a'],
      ['a', 'b'],
      ['b'],
      ['c'],
      ['a', 'c'],
      ['b', 'c'],
      [],
      ['c'],
      ['c', 'b'],
      ['b'],
      ['a'],
      ['c', 'a'],
      ['b', 'a'],
    ],
  },
])('array (with ordering)', ({ value, targetLength, expectedShrinks }) => {
  const shrinker = dev.Shrink.array<string>(targetLength, (x) => x.charCodeAt(0));

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});

test.each([
  {
    value: [],
    elementShrinker: dev.Shrink.towardsNumber(nativeCalculator, nativeCalculator.zero),
    expectedShrinks: [],
  },
  {
    value: [1],
    elementShrinker: dev.Shrink.towardsNumber(nativeCalculator, nativeCalculator.zero),
    expectedShrinks: [[0]],
  },
  {
    value: [1, 2],
    elementShrinker: dev.Shrink.towardsNumber(nativeCalculator, nativeCalculator.zero),
    expectedShrinks: [
      [0, 2],
      [1, 0],
      [1, 1],
    ],
  },
  {
    value: [1, 1, 0],
    elementShrinker: dev.Shrink.towardsNumber(nativeCalculator, nativeCalculator.zero),
    expectedShrinks: [
      [0, 1, 0],
      [1, 0, 0],
    ],
  },
])('elements', ({ value, elementShrinker, expectedShrinks }) => {
  const shrinker = dev.Shrink.elements(elementShrinker);

  const shrinks = Array.from(shrinker(value.map(nativeCalculator.loadIntegerUnchecked))).map((xs) =>
    xs.map(nativeCalculator.loadIntegerUnchecked),
  );

  expect(shrinks).toEqual(expectedShrinks);
});
