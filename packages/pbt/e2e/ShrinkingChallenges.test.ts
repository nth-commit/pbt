import { max } from 'ix/iterable';
import * as dev from '../src';
import * as domainGen from './domainGen';

// Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
test.property('Fallacy: the array is in reverse order', domainGen.seed(), domainGen.size(), (seed, size) => {
  const g = dev.Gen.integer().array();

  const m = dev.minimal(
    g,
    (xs) => {
      const xs0 = [...xs].sort((a, b) => b - a);
      return xs.every((x, i) => x === xs0[i]);
    },
    { seed, size },
  );

  expect([
    [0, 1],
    [-1, 0],
  ]).toContainEqual(m);
});

// Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/lengthlist.md
test.property(
  'Fallacy: the array does not contain a value >= 900',
  domainGen.seed(),
  domainGen.size(),
  (seed, size) => {
    const g = dev.Gen.integer()
      .between(1, 100)
      .flatMap((length) => dev.Gen.integer().between(0, 1000).array().ofLength(length));

    const m = dev.minimal(g, (xs) => max(xs) < 900, { seed, size });

    expect(m).toEqual([900]);
  },
);
