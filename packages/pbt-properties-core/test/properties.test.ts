import * as fc from 'fast-check';
import { property } from '../src';
import {
  arbitraryGenValues,
  arbitraryIterations,
  arbitraryPropertyFixture,
  arbitrarySeed,
  arbitrarySucceedingPropertyFunction,
} from './helpers/arbitraries';
import { GenStub } from './helpers/stubs';

test('Given a succeeding property function, the property holds', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), arbitrarySucceedingPropertyFunction(), (config, f) => {
      const p = property(GenStub.fromArray(config.values), f);

      const result = p(config);

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false predicate, the property does not hold', () => {
  fc.assert(
    fc.property(arbitraryPropertyFixture(), config => {
      const f = () => false;
      const p = property(GenStub.fromArray(config.values), f);

      const result = p(config);

      expect(result).toEqual({ kind: 'failure', problem: { kind: 'predicate' } });
    }),
  );
});

test('Given iterations exceeds generator capacity, the property does not hold', () => {
  fc.assert(
    fc.property(
      arbitraryGenValues(),
      arbitrarySeed(),
      arbitraryIterations(),
      arbitrarySucceedingPropertyFunction(),
      (values, seed, iterationsDiff, f) => {
        const p = property(GenStub.fromArray(values), f);

        const iterations = values.length + iterationsDiff;
        const result = p({ iterations, seed });

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
      arbitrarySeed(),
      arbitraryIterations(),
      arbitrarySucceedingPropertyFunction(),
      (values, seed, iterationsDiff, f) => {
        const p = property(GenStub.exhaustAfter(values), f);

        const iterations = values.length + iterationsDiff;
        const result = p({ iterations, seed });

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
