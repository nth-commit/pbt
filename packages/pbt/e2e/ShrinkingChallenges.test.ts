import { assert, property, Gen } from 'pbt-vnext';
import { max, min } from 'simple-statistics';
import * as dev from '../src';
import { failwith } from '../test/Helpers/failwith';
import * as domainGen from './domainGen';

test.skip('Fallacy: the array is in reverse order', () => {
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

test.skip('Fallacy: the array does not contain a value >= x', () => {
  // Based on: https://github.com/jlink/shrinking-challenge/blob/main/challenges/lengthlist.md
  // But; it's been scaled down so that it can suitably be run in the test suite
  assert(
    property(domainGen.seed(), domainGen.size(), (seed, size) => {
      const g = dev.Gen.integer()
        .between(1, 2)
        .growBy('constant')
        .flatMap((length) => {
          return dev.Gen.integer()
            .between(0, 100)
            .growBy('constant')
            .array()
            .ofLength(length)
            .map((xs) => {
              return xs;
            });
        });

      const p = dev.property(g, (xs) => {
        expect(max(xs)).toBeLessThan(90);
      });

      const checkResult = dev.check(p, { seed, size });

      console.log(JSON.stringify(checkResult, null, 2));

      if (checkResult.kind !== 'falsified') return failwith('expected falsified');
      expect(checkResult.counterexample.value[0]).toEqual([90]);
    }),
    { seed: 2737982447, size: 0, path: '' },
  );
});
