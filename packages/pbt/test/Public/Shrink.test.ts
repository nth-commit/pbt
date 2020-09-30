import { assert, property } from 'pbt-0.0.1';
import * as dev from '../../src/Public';
import * as domainGen from './Helpers/domainGenV2';
import * as PropertyResultHelpers from './Helpers/PropertyResultHelpers';

const expectCounterexample = <Values extends dev.AnyValues>(propertyResult: any, counterexample: Values): void => {
  try {
    expect(PropertyResultHelpers.asFalsified(propertyResult).counterexample).toEqual(counterexample);
  } catch (e) {
    console.log({
      seed: propertyResult.seed.valueOf(),
      size: propertyResult.size,
      iteration: propertyResult.iteration,
    });
    throw e;
  }
};

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
