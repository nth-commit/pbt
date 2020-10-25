import fc from 'fast-check';
import * as domainGen from './Helpers/domainGen';
import * as dev from './srcShim';

const expectCounterexample = <Values extends dev.AnyValues>(
  actualResult: dev.CheckResult<Values>,
  expectedValues: Values,
): void => {
  const expectedResult: Partial<dev.CheckResult<Values>> = {
    kind: 'fail',
    counterexample: {
      value: expectedValues,
      complexity: expect.anything(),
      path: expect.anything(),
      reason: expect.anything(),
    },
  };

  try {
    expect(actualResult).toMatchObject(expectedResult);
  } catch (e) {
    // console.log(JSON.stringify(actualResult, null, 2));
    throw e;
  }
};

test('Normalizes: Reversing a list', () => {
  // https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
  fc.assert(
    fc.property(domainGen.seed(), (seed) => {
      const integer = dev.Gen.naturalNumber(100);
      const arr = dev.Gen.array(integer);

      const result = dev.check(
        dev.explore([arr], (xs) => {
          const xs0 = [...xs].sort((a, b) => b - a);

          expect(xs).toEqual(xs0);
        }),
        {
          seed,
        },
      );

      expectCounterexample(result, [[0, 1]]);
    }),
  );
});

test('Normalizes: Large Union List', () => {
  // https://github.com/jlink/shrinking-challenge/blob/main/challenges/large_union_list.md
  fc.assert(
    fc.property(domainGen.seed(), (seed) => {
      const integer = dev.Gen.naturalNumber(100);
      const innerArr = dev.Gen.array(integer);
      const outerArr = dev.Gen.array(innerArr);

      const result = dev.check(
        dev.explore([outerArr], (xss) => {
          const set = new Set<number>();
          for (const xs of xss) {
            for (const x of xs) {
              set.add(x);
            }
          }
          return set.size < 5;
        }),
        { seed },
      );

      expectCounterexample(result, [[[0, 1, 2, 3, 4]]]);
    }),
  );
});

test('Normalizes: Length list', () => {
  // https://github.com/jlink/shrinking-challenge/blob/main/challenges/lengthlist.md
  fc.assert(
    fc.property(domainGen.seed(), (seed) => {
      const integer = dev.Gen.naturalNumber(100);
      const length = dev.Gen.integer(dev.Range.linear(1, 50));
      const arr = length.flatMap((l) => dev.Gen.array(integer, dev.Range.constant(1, l)));

      const result = dev.check(
        dev.explore([arr], (xs) => {
          const max = xs.reduce((runningMax, curr) => (runningMax > curr ? runningMax : curr), -1);

          return max < 90;
        }),
        { seed },
      );

      expectCounterexample(result, [[90]]);
    }),
  );
});
