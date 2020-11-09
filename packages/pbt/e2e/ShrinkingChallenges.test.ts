import fc from 'fast-check';
import { max } from 'ix/iterable';
import { assert, property } from 'pbt-vnext';
import * as dev from '../src';
import * as domainGen from './domainGen';

test('Fallacy: the array is in reverse order', () => {
  // Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
  assert(
    property(domainGen.seed(), domainGen.size(), (seed, size) => {
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
    }),
  );
});

test('Fallacy: the array does not contain a value >= 900', () => {
  // Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/lengthlist.md
  assert(
    property(domainGen.seed(), domainGen.size(), (seed, size) => {
      const g = dev.Gen.integer()
        .between(1, 100)
        .flatMap((length) => dev.Gen.integer().between(0, 1000).array().ofLength(length));

      const m = dev.minimal(g, (xs) => max(xs) < 900, { seed, size });

      expect(m).toEqual([900]);
    }),
  );
});
