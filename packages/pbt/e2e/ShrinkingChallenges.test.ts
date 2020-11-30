import * as dev from '../src';

// Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
test.property('Smallest array not in descending order', () => {
  const numberArrayEquals = (as: number[], bs: number[]): boolean =>
    as.length === bs.length && as.every((a, i) => a === bs[i]);

  const g = dev.Gen.integer().array();

  const m = dev.minimalValue(g, (xs) => {
    const xsDescending = [...xs].sort((a, b) => b - a);
    return !numberArrayEquals(xs, xsDescending);
  });

  expect(m).toBeOneOf([
    [0, 1],
    [-1, 0],
  ]);
});

// Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/lengthlist.md
test.property('Smallest array containing element >= 900', () => {
  const g = dev.Gen.integer()
    .between(1, 100)
    .flatMap((length) => dev.Gen.integer().between(0, 1000).array().ofLength(length));

  const m = dev.minimalValue(g, (xs) => xs.some((x) => x >= 900));

  expect(m).toEqual([900]);
});
