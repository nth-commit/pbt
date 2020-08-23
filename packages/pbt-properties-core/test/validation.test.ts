import * as fc from 'fast-check';
import { property } from '../src';
import { arbitraryDecimal, arbitraryGenValues, arbitraryPropertyFunction, arbitrarySeed } from './helpers/arbitraries';
import { DEFAULT_MAX_ITERATIONS } from './helpers/constants';
import { GenStub } from './helpers/stubs';

test('Given iterations = 0, the property returns a validation failure', () => {
  fc.assert(
    fc.property(arbitrarySeed(), arbitraryGenValues(), arbitraryPropertyFunction(), (seed, values, f) => {
      const p = property(GenStub.fromArray(values), f);

      const result = p({ iterations: 0, seed });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'iterations',
          message: 'Number of iterations must be greater than 0',
        },
      });
    }),
  );
});

test('Given iterations < 0, the property returns a validation failure', () => {
  fc.assert(
    fc.property(
      arbitrarySeed(),
      arbitraryGenValues(),
      arbitraryPropertyFunction(),
      fc.integer(-1),
      (seed, values, f, iterations) => {
        const p = property(GenStub.fromArray(values), f);

        const result = p({ iterations, seed });

        expect(result).toEqual({
          kind: 'validationFailure',
          problem: {
            kind: 'iterations',
            message: 'Number of iterations must be greater than 0',
          },
        });
      },
    ),
  );
});

test('Given iterations is a decimal, the property returns a validation failure', () => {
  fc.assert(
    fc.property(
      arbitrarySeed(),
      arbitraryGenValues(),
      arbitraryPropertyFunction(),
      arbitraryDecimal(1, DEFAULT_MAX_ITERATIONS),
      (seed, values, f, iterations) => {
        const p = property(GenStub.fromArray(values), f);

        const result = p({ iterations, seed });

        expect(result).toEqual({
          kind: 'validationFailure',
          problem: {
            kind: 'iterations',
            message: 'Number of iterations must be an integer',
          },
        });
      },
    ),
  );
});
