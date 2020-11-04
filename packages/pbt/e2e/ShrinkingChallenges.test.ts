import { assert, property, Gen } from 'pbt-vnext';
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
