import * as fc from 'fast-check';
import { property } from '../src';
import {
  arbitraryGenValue,
  arbitraryGenValues,
  arbitraryIterations,
  arbitraryPropertyFixture,
  arbitraryPropertyFunction,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('The test function receives a value from the generator', () => {
  fc.assert(
    fc.property(arbitraryPropertyFunction(), arbitraryGenValue(), (f, x) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.singleton(x), spyF);

      p(1);

      expect(spyF).toBeCalledWith(x);
    }),
  );
});

test('Given a true predicate, the test function is only called once for each iteration', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), arbitrarySucceedingPropertyFunction(), ({ values, iterations }, f) => {
      const spyF = jest.fn<boolean, unknown[]>(f);
      const p = property(GenStub.fromArray(values), spyF);

      p(iterations);

      expect(spyF).toHaveBeenCalledTimes(iterations);
    }),
  );
});

test('Given a succeeding property function, the property holds', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), arbitrarySucceedingPropertyFunction(), ({ values, iterations }, f) => {
      const p = property(GenStub.fromArray(values), f);

      const result = p(iterations);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), ({ values, iterations }) => {
      const f = () => false;
      const p = property(GenStub.fromArray(values), f);

      const result = p(iterations);

      expect(result).toEqual({ kind: 'failure', problem: { kind: 'predicate' } });
    }),
  );
});

test('Given iterations exceeds generator capacity, the property does not hold', () => {
  fc.assert(
    fc.property(
      arbitraryGenValues(),
      arbitraryIterations(),
      arbitrarySucceedingPropertyFunction(),
      (values, iterationsDiff, f) => {
        const p = property(GenStub.fromArray(values), f);

        const iterations = values.length + iterationsDiff;
        const result = p(iterations);

        expect(result).toEqual({
          kind: 'failure',
          problem: {
            kind: 'exhaustion',
            iterationsRequested: iterations,
            iterationsCompleted: values.length,
          },
        });
      },
    ),
  );
});

test('Given an exhausting generator, the property does not hold', () => {
  fc.assert(
    fc.property(
      arbitraryGenValues(),
      arbitraryIterations(),
      arbitrarySucceedingPropertyFunction(),
      (values, iterationsDiff, f) => {
        const p = property(GenStub.exhaustAfter(values), f);

        const iterations = values.length + iterationsDiff;
        const result = p(iterations);

        expect(result).toEqual({
          kind: 'failure',
          problem: {
            kind: 'exhaustion',
            iterationsRequested: iterations,
            iterationsCompleted: values.length,
          },
        });
      },
    ),
  );
});
