import * as fc from 'fast-check';
import { property } from '../src';
import {
  arbitraryExtendableTuple,
  arbitraryPropertyConfig,
  arbitraryGenValues,
  arbitraryGenValue,
  arbitraryIterations,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(() => arbitraryGenValue())
    .extend(() => arbitraryPropertyFunction())
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, x, f]) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.singleton(x), spyF);

      p({ ...config, iterations: 1 });

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('Given a succeeding property function, the test function is only called once for each iteration', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGenValues(iterations))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, values, f]) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.fromArray(values), spyF);

      p(config);

      expect(spyF).toHaveBeenCalledTimes(config.iterations);
    }),
  );
});

test('Given a succeeding property function, the property holds', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGenValues(iterations))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, values, f]) => {
      const p = property(GenStub.fromArray(values), f);

      const result = p(config);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGenValues(iterations))
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, values]) => {
      const f = () => false;
      const p = property(GenStub.fromArray(values), f);

      const result = p(config);

      expect(result).toEqual({ kind: 'failure', problem: { kind: 'predicate' } });
    }),
  );
});

test('Given iterations exceeds generator capacity, the property does not hold', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGenValues(iterations))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .extend(() => arbitraryIterations())
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, values, f, iterationsDiff]) => {
      const p = property(GenStub.fromArray(values), f);

      const iterations = values.length + iterationsDiff;
      const result = p({ ...config, iterations });

      expect(result).toEqual({
        kind: 'failure',
        problem: {
          kind: 'exhaustion',
          iterationsRequested: iterations,
          iterationsCompleted: values.length,
        },
      });
    }),
  );
});

test('Given an exhausting generator, the property does not hold', () => {
  const arb = arbitraryExtendableTuple(arbitraryPropertyConfig())
    .extend(({ iterations }) => arbitraryGenValues(iterations))
    .extend(() => arbitrarySucceedingPropertyFunction())
    .extend(() => arbitraryIterations())
    .toArbitrary();

  fc.assert(
    fc.property(arb, ([config, values, f, iterationsDiff]) => {
      const p = property(GenStub.exhaustAfter(values), f);

      const iterations = values.length + iterationsDiff;
      const result = p({ ...config, iterations });

      expect(result).toEqual({
        kind: 'failure',
        problem: {
          kind: 'exhaustion',
          iterationsRequested: iterations,
          iterationsCompleted: values.length,
        },
      });
    }),
  );
});
