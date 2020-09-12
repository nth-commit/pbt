import * as fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  arbitraryPropertyConfig,
  arbitraryPropertyFunction,
  arbitraryDecimal,
  arbitraryGens,
  arbitrarilyShuffleIn,
} from './helpers/arbitraries';
import { DEFAULT_MAX_ITERATIONS } from './helpers/constants';

test('Given iterations is a decimal, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    arbitraryDecimal(1, DEFAULT_MAX_ITERATIONS),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, iterations) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, iterations });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'iterations',
          message: 'Number of iterations must be an integer',
        },
      });
    }),
  );
});

test('Given iterations <= 0, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    fc.oneof(fc.constant(0), fc.integer(0)),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, iterations) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, iterations });

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

test('Given size is a decimal, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    arbitraryDecimal(0, 100),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, size) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, size });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'size',
          message: 'Size must be an integer',
        },
      });
    }),
  );
});

test('Given size < 0, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    fc.oneof(fc.constant(-1), fc.integer(-1)),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, size) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, size });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'size',
          message: 'Size must be greater than or equal to 0',
        },
      });
    }),
  );
});

test('Given size > 100, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    fc.oneof(fc.constant(101), fc.integer(101, Number.MAX_SAFE_INTEGER)),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, size) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, size });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'size',
          message: 'Size must be less than or equal to 100',
        },
      });
    }),
  );
});

test('Given shrinkPath contains a decimal, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    fc
      .tuple(fc.array(fc.nat()), arbitraryDecimal(0, 1000))
      .chain(([validPathComponents, invalidPathComponent]) =>
        arbitrarilyShuffleIn(validPathComponents, invalidPathComponent),
      ),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, shrinkPath) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, shrinkPath });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'shrinkPath',
          message: 'Shrink path may only contain integers',
        },
      });
    }),
  );
});

test('Given shrinkPath contains a negative number, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens(),
    arbitraryPropertyFunction(),
    fc
      .tuple(fc.array(fc.nat()), fc.integer(-1))
      .chain(([validPathComponents, invalidPathComponent]) =>
        arbitrarilyShuffleIn(validPathComponents, invalidPathComponent),
      ),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, shrinkPath) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, shrinkPath });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'shrinkPath',
          message: 'Shrink path may not contain negative numbers',
        },
      });
    }),
  );
});

test('Given a non-empty shrinkPath, and a some gens that do not shrink, the property returns a validation failure', () => {
  const arbitraries = [
    arbitraryPropertyConfig(),
    arbitraryGens().map((gs) => gs.map((g) => g.noShrink())),
    arbitraryPropertyFunction(),
    fc.array(fc.nat(), 1, 1),
  ] as const;

  stable.assert(
    stable.property(...arbitraries, (config, gs, f, shrinkPath) => {
      const p = dev.property(...gs, f);

      const result = p({ ...config, shrinkPath });

      expect(result).toEqual({
        kind: 'validationFailure',
        problem: {
          kind: 'shrinkPath',
          message:
            'Shrink path was invalidated, re-run failing property without specifying shrinkPath to receive a relevant counterexample',
        },
      });
    }),
  );
});
