import fc from 'fast-check';
import * as dev from '../src';
import * as devGen from 'pbt-gen';
import * as stable from './helpers/stableApi';
import {
  arbitraryPropertyConfig,
  arbitraryFailingPropertyFunction,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { spyOn } from './helpers/spies';

const failwith = (str: string): void => {
  throw new Error(str);
};

const arrayRange = (startIndex: number, endIndex: number): number[] =>
  [...Array(endIndex).keys()].map((x) => x + startIndex);

test('A failure result is reproducible with the returned parameters', () => {
  // TODO: Use any f, that may or may not fail, and discard if the property did not fail

  stable.assert(
    stable.property(
      arbitraryPropertyConfig(),
      fc.integer(0, 10).map((n) => arrayRange(0, n).map(() => devGen.integer.unscaled(0, 10))),
      fc.integer(0, 10).chain((n) => arbitraryFailingPropertyFunction(n)),
      (config, gs, f) => {
        const p = dev.property(...gs, f);

        const result = p({ ...config, iterations: 100 });

        if (result.kind !== 'failure') return failwith(`Expected result to be of kind 'failure'`);

        const { seed, size } = result;
        const result0 = p({
          ...config,
          seed,
          size,
          shrinkPath: result.counterexample.shrinkPath,
        });

        if (result0.kind !== 'failure') return failwith(`Expected result0 to be of kind 'failure'`);

        expect(result0.counterexample).toEqual(result.counterexample);
      },
    ),
  );
});

test('A property can eventually become successful, when reproduced with an existing failure', () => {
  stable.assert(
    stable.property(
      arbitraryPropertyConfig(),
      fc.integer(0, 10).map((n) => arrayRange(0, n).map(() => devGen.integer.unscaled(0, 10))),
      fc.integer(0, 10).chain((n) => arbitraryFailingPropertyFunction(n)),
      arbitrarySucceedingPropertyFunction(),
      (config, gs, fallibleF, infallibleF) => {
        const p = dev.property(...gs, fallibleF);
        const result = p({ ...config, iterations: 100 });

        if (result.kind !== 'failure') return failwith(`Expected result to be of kind 'failure'`);

        const { seed, size, counterexample } = result;
        const p0 = dev.property(...gs, infallibleF);
        const result0 = p0({
          ...config,
          seed,
          size,
          shrinkPath: counterexample.shrinkPath,
        });

        expect(result0.kind).toEqual('success');
      },
    ),
  );
});

test('A property function is only invoked again once, after a failure is reproduced with the returned shrinkPath', () => {
  stable.assert(
    stable.property(
      arbitraryPropertyConfig(),
      fc.integer(0, 10).map((n) => arrayRange(0, n).map(() => devGen.integer.unscaled(0, 10))),
      fc.integer(0, 10).chain((n) => arbitraryFailingPropertyFunction(n)),
      (config, gs, f) => {
        const spyF = spyOn(f);
        const p = dev.property(...gs, spyF);

        const result = p({ ...config, iterations: 100 });

        if (result.kind !== 'failure') return failwith(`Expected result to be of kind 'failure'`);

        spyF.mockClear();
        const { seed, size, counterexample } = result;
        p({
          ...config,
          seed,
          size,
          shrinkPath: counterexample.shrinkPath,
        });

        expect(spyF).toBeCalledTimes(1);
        expect(spyF).toBeCalledWith(...counterexample.values);
      },
    ),
  );
});
