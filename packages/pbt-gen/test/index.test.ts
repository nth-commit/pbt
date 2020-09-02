import { toArray, pipe } from 'ix/iterable';
import { take, filter, map } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryInteger } from './helpers/arbitraries';
import { calculateProbabilityOfUniformDistribution } from './helpers/statistics';

describe('integer', () => {
  test('It always generates an instance', () => {
    stable.assert(
      stable.property(
        arbitraryGenParams(),
        arbitraryIterations(),
        arbitraryInteger(),
        arbitraryInteger(),
        ({ seed, size }, iterations, min, max) => {
          const g = dev.integer.constant(min, max);

          const xs = toArray(pipe(g(seed, size), take(iterations)));

          expect(xs).not.toHaveLength(0);
          xs.forEach((x) => {
            expect(x.kind).toEqual('instance');
          });
        },
      ),
    );
  });

  test('Instances are integers', () => {
    stable.assert(
      stable.property(
        arbitraryGenParams(),
        arbitraryIterations(),
        arbitraryInteger(),
        arbitraryInteger(),
        ({ seed, size }, iterations, min, max) => {
          const g = dev.integer.constant(min, max);

          const xs = toArray(
            pipe(
              g(seed, size),
              filter(devCore.GenResult.isInstance),
              map((r) => r.value),
              take(iterations),
            ),
          );

          expect(xs).not.toHaveLength(0);
          xs.forEach((x) => {
            expect(x).toEqual(Math.round(x));
          });
        },
      ),
    );
  });

  test('Instances are within the range', () => {
    stable.assert(
      stable.property(
        arbitraryGenParams(),
        arbitraryIterations(),
        arbitraryInteger(),
        arbitraryInteger(),
        ({ seed, size }, iterations, min, max) => {
          const g = dev.integer.constant(min, max);

          const xs = toArray(
            pipe(
              g(seed, size),
              filter(devCore.GenResult.isInstance),
              map((r) => r.value),
              take(iterations),
            ),
          );

          expect(xs).not.toHaveLength(0);
          xs.forEach((x) => {
            const [actualMin, actualMax] = [min, max].sort((a, b) => a - b);
            expect(x).toBeGreaterThanOrEqual(actualMin);
            expect(x).toBeLessThanOrEqual(actualMax);
          });
        },
      ),
    );
  });

  test('Instances are uniformly distributed', () => {
    const arbIterations = arbitraryIterations()
      .noShrink()
      .filter((x) => x > 50);

    stable.assert(
      stable.property(arbitraryGenParams(), arbIterations, ({ seed, size }, iterations) => {
        const min = 0;
        const max = 10;
        const g = dev.integer.constant(min, max);

        const xs = toArray(
          pipe(
            g(seed, size),
            filter(devCore.GenResult.isInstance),
            map((r) => r.value),
            take(iterations),
          ),
        );

        const { pValue } = calculateProbabilityOfUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.001);
      }),
    );
  });
});
