import { property } from '../src';
import { stableAssert, stableProperty } from './helpers/stableApi';
import {
  arbitraryExtendableTuple,
  arbitraryPropertyConfig,
  arbitraryGenValue,
  arbitraryGens,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
  arbitrarilyShuffleArray,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(() => arbitraryGenValue())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  stableAssert(
    stableProperty(arb, ([config, x, f]) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.singleton(x), spyF);

      p({ ...config, iterations: 1 });

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('Given a succeeding property function, the test function is only called once for each iteration', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGens({ minLength: iterations, minGens: 0 }))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stableAssert(
    stableProperty(arb, ([config, gs, f]) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(...gs, spyF);

      p(config);

      expect(spyF).toHaveBeenCalledTimes(config.iterations);
    }),
  );
});

test('Given an exhausting generator, the property does not hold', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) =>
      arbitraryGens({ minLength: iterations })
        .map((gs) => [...gs, GenStub.exhausted()])
        .chain(arbitrarilyShuffleArray),
    )
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  stableAssert(
    stableProperty(arb, ([config, gs, f]) => {
      const p = property(...gs, f);

      const result = p(config);

      expect(result).toEqual({
        kind: 'failure',
        problem: {
          kind: 'exhaustion',
          iterationsRequested: config.iterations,
          iterationsCompleted: 0,
        },
      });
    }),
  );
});
