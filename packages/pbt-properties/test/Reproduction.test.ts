import fc from 'fast-check';
import * as dev from '../src';
import * as devGen from 'pbt-gen';
import * as stable from './helpers/stableApi';
import { arbitraryPropertyConfig, arbitraryFailingPropertyFunction } from './helpers/arbitraries';
import { empty } from 'ix/iterable';

const failwith = (str: string): void => {
  throw new Error(str);
};

const arrayRange = (startIndex: number, endIndex: number): number[] =>
  [...Array(endIndex).keys()].map((x) => x + startIndex);

const echoGen = () =>
  devGen.create(
    (seed, size) => ({ seedApproximation: seed.nextInt(0, 10_000), size }),
    () => empty(),
  );

test('Given a failing property function, the result is reproducible', () => {
  // TODO: Use any f, that may or may not fail, and discard if the property did not fail

  stable.assert(
    stable.property(
      arbitraryPropertyConfig(),
      fc.integer(0, 10).map((n) => arrayRange(0, n).map(echoGen)),
      fc.integer(0, 10).chain((n) => arbitraryFailingPropertyFunction(n)),
      (config, gs, f) => {
        const p = dev.property(...gs, f);

        const result = p({ ...config, iterations: 100 });

        if (result.kind !== 'failure' || result.problem.kind !== 'predicate')
          return failwith(`Expected result to be of kind 'failure'`);

        const { seed, size } = result.problem;
        const result0 = p({
          ...config,
          seed,
          size,
        });

        if (result0.kind !== 'failure' || result0.problem.kind !== 'predicate')
          return failwith(`Expected result0 to be of kind 'failure'`);

        expect(result0.problem.counterexample).toEqual(result.problem.counterexample);
      },
    ),
  );
});
