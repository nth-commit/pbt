import { assert, property, gen } from 'pbt-0.0.1';
import * as dev from '../../src/Public';
import * as domainGen from './Helpers/domainGenV2';

const asFailure = <Values extends dev.AnyValues>(
  propertyResult: dev.PropertyResult<Values>,
): dev.PropertyResult.Falsification<Values> => propertyResult as dev.PropertyResult.Falsification<Values>;

const expectCounterexample = <Values extends dev.AnyValues>(
  propertyResult: dev.PropertyResult<Values>,
  counterexample: Values,
): void => {
  try {
    expect(asFailure(propertyResult).counterexample.values).toEqual(counterexample);
  } catch (e) {
    console.log({
      seed: propertyResult.seed.valueOf(),
      size: propertyResult.size,
      iteration: propertyResult.iteration,
    });
    throw e;
  }
};

test('A true predicate property returns a success result', () => {
  assert(
    property(domainGen.seed(), (seed) => {
      const p = dev.property(() => true);

      const result = dev.check(p, { seed });

      const expectedResult: dev.PropertyResult<[]> = {
        kind: 'success',
        iteration: 100,
        seed: expect.anything(),
        size: expect.anything(),
      };
      expect(result).toEqual(expectedResult);
    }),
  );
});

test('A false predicate property returns a success result', () => {
  assert(
    property(domainGen.seed(), (seed) => {
      const p = dev.property(() => false);

      const result = dev.check(p, { seed });

      const expectedResult: dev.PropertyResult<[]> = {
        kind: 'falsification',
        iteration: 1,
        seed: expect.anything(),
        size: expect.anything(),
        counterexample: {
          path: [],
          values: [],
        },
      };
      expect(result).toEqual(expectedResult);
    }),
  );
});

test('It finds the minimal shrink: a list that is expected to be in reverse order', () => {
  // https://github.com/jlink/shrinking-challenge/blob/main/challenges/reverse.md
  assert(
    property(domainGen.seed(), (seed) => {
      const integer = dev.gen.naturalNumber.scaleLinearly(100);
      const arr = dev.gen.array.scaleLinearly(2, 10, integer);

      const p = dev.property(arr, (xs) => {
        const xs0 = [...xs].sort((a, b) => b - a);

        expect(xs).toEqual(xs0);
      });

      const result = dev.check(p, { seed });

      expectCounterexample(result, [[0, 1]]);
    }),
  );
});
