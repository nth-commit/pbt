import fc from 'fast-check';
import { max } from 'ix/iterable';
import { assert, property } from 'pbt-vnext';
import * as dev from '../src';
import { failwith } from '../test/Helpers/failwith';
import * as domainGen from './domainGen';

test('Fallacy: the array is in reverse order', () => {
  // Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
  assert(
    property(domainGen.seed(), domainGen.size(), (seed, size) => {
      const g = dev.Gen.integer().array();

      const p = dev.property(g, (xs) => {
        expect(xs).toEqual([...xs].sort((a, b) => b - a));
      });

      const checkResult = dev.check(p, { seed, size });

      if (checkResult.kind !== 'falsified') return failwith('expected falsified');
      const expectedEither = [
        [0, 1],
        [-1, 0],
      ];
      expect(expectedEither).toContainEqual(checkResult.counterexample.value[0]);
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

      const p = dev.property(g, (xs) => {
        expect(max(xs)).toBeLessThan(900);
      });

      const checkResult = dev.check(p, { seed, size });

      if (checkResult.kind !== 'falsified') return failwith('expected falsified');
      expect(checkResult.counterexample.value[0]).toEqual([900]);
    }),
  );
});
