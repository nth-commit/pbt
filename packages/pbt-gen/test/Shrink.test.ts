import { Shrink } from '../src/Shrink';

test.each([
  { target: 0, dp: 0, value: 0, expectedShrinks: [] },
  { target: 0, dp: 0, value: 100, expectedShrinks: [0, 50, 75, 87, 93, 96, 98, 99] },
  { target: 0, dp: 0, value: 200, expectedShrinks: [0, 100, 150, 175, 187, 193, 196, 198, 199] },
  { target: 10, dp: 0, value: 100, expectedShrinks: [10, 55, 77, 88, 94, 97, 98, 99] },
  { target: -10, dp: 0, value: 100, expectedShrinks: [-10, 45, 72, 86, 93, 96, 98, 99] },
  { target: 0, dp: 0, value: -100, expectedShrinks: [0, -50, -75, -87, -93, -96, -98, -99] },
  { target: -10, dp: 0, value: 0, expectedShrinks: [-10, -5, -3, -2, -1] },
])('towardsNumber', ({ target, dp, value, expectedShrinks }) => {
  const shrinker = Shrink.towardsNumber(target, dp);

  const shrinks = Array.from(shrinker(value));

  expect(shrinks).toEqual(expectedShrinks);
});
