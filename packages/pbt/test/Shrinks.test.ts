import { assert, property, gen } from 'pbt-0.0.1';
import * as dev from '../src';
import { RunResult } from '../src/Run';

const domainGen = {
  seed: () => gen.naturalNumber.unscaled(1_000_000).noShrink(),
};

const asFailure = <T extends any[]>(runResult: RunResult<T>): RunResult.Failure<T> => runResult as RunResult.Failure<T>;

test('Reverse', () => {
  // https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
  assert(
    property(domainGen.seed(), (seed) => {
      const integer = dev.gen.naturalNumber.scaleLinearly(100);
      const arr = dev.gen.array.scaleLinearly(2, 10, integer);

      const result = dev.run(
        dev.property(arr, (xs) => {
          const xs0 = [...xs].sort((a, b) => b - a);

          expect(xs).toEqual(xs0);
        }),
        {
          seed,
        },
      );

      expect(asFailure(result).counterexample.values).toEqual([[0, 1]]);
    }),
  );
});
