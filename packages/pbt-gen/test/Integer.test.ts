import fc from 'fast-check';
import { toArray, pipe, first, last, count } from 'ix/iterable';
import { take, map } from 'ix/iterable/operators';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryInteger, arbitrarySize } from './helpers/arbitraries';
import { analyzeUniformDistribution } from './helpers/statistics';
import { castToInstance, withoutShrinkFunction } from './helpers/iterableOperators';
import { Seed } from 'pbt-core';

type GeneralizedIntegerGenFactory = (min: number, max: number) => dev.Gen<number>;

const arbitraryIntegerGenFactory = (): fc.Arbitrary<GeneralizedIntegerGenFactory> =>
  fc.constantFrom(...Object.values(dev.integer));

test('It always generates an instance', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryInteger(),
      arbitraryInteger(),
      arbitraryIntegerGenFactory(),
      ({ seed, size }, iterations, min, max, gFactory) => {
        const g = gFactory(min, max);

        const xs = toArray(pipe(g(seed, size), take(iterations)));

        expect(xs).not.toHaveLength(0);
        xs.forEach((x) => {
          expect(x.kind).toEqual('instance');
        });
      },
    ),
  );
});

test('It is resilient to min/max parameter order', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryInteger(),
      arbitraryInteger(),
      arbitraryIntegerGenFactory(),
      ({ seed, size }, iterations, min, max, gFactory) => {
        const g1 = gFactory(min, max);
        const g2 = gFactory(max, min);

        const iterate = (g: dev.Gen<number>) => toArray(pipe(g(seed, size), withoutShrinkFunction(), take(iterations)));

        expect(iterate(g1)).toEqual(iterate(g2));
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
      arbitraryIntegerGenFactory(),
      ({ seed, size }, iterations, min, max, gFactory) => {
        const g = gFactory(min, max);

        const xs = toArray(
          pipe(
            g(seed, size),
            castToInstance(),
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
      arbitraryIntegerGenFactory(),
      ({ seed, size }, iterations, min, max, gFactory) => {
        const g = gFactory(min, max);

        const xs = toArray(
          pipe(
            g(seed, size),
            castToInstance(),
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

test('Instances shrink with "towardsNumber"', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryInteger(),
      arbitraryInteger(),
      arbitraryIntegerGenFactory(),
      ({ seed, size }, iterations, min, max, gFactory) => {
        const g = gFactory(min, max);

        const instances = toArray(pipe(g(seed, size), castToInstance(), take(iterations)));

        expect(instances).not.toHaveLength(0);
        instances.forEach((instance) => {
          const [actualMin] = [min, max].sort((a, b) => a - b);
          const shrinks = instance.shrink();

          if (instance.value !== actualMin) {
            expect(count(shrinks)).toBeGreaterThanOrEqual(1);
          }

          if (count(shrinks) >= 1) {
            expect(first(shrinks)!.value).toEqual(actualMin);
          }

          if (count(shrinks) >= 2) {
            expect(last(shrinks)!.value).toEqual(instance.value - 1);
          }
        });
      },
    ),
  );
});

describe('Constant', () => {
  test('Instances are uniformly distributed across the range', () => {
    stable.assert(
      stable.property(arbitrarySize(), (size) => {
        const seed = Seed.spawn();
        const sampleSize = 1_000;
        const min = 0;
        const max = 10;
        const g = dev.integer.unscaled(min, max);

        const xs = toArray(
          pipe(
            g(seed, size),
            castToInstance(),
            map((r) => r.value),
            take(sampleSize),
          ),
        );

        const { pValue } = analyzeUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.01);
      }),
      {
        numRuns: 1,
      },
    );
  });
});

describe('Linear', () => {
  test('If size = 0, instances are equal to min', () => {
    stable.assert(
      stable.property(
        arbitraryGenParams(),
        arbitraryIterations(),
        arbitraryInteger(),
        arbitraryInteger(),
        ({ seed }, iterations, min, max) => {
          const size = 0;
          const g = dev.integer.scaleLinearly(min, max);

          const xs = toArray(
            pipe(
              g(seed, size),
              castToInstance(),
              map((r) => r.value),
              take(iterations),
            ),
          );

          expect(xs).not.toHaveLength(0);
          xs.forEach((x) => {
            const [actualMin] = [min, max].sort((a, b) => a - b);
            expect(x).toEqual(actualMin);
          });
        },
      ),
    );
  });

  test.each([
    { min: 0, max: 10, size: 50, scaledMax: 5 },
    { min: -10, max: 0, size: 50, scaledMax: -5 },
    { min: -5, max: 5, size: 50, scaledMax: 0 },
    { min: -5, max: 6, size: 50, scaledMax: 1 },
    { min: -6, max: 5, size: 50, scaledMax: 0 }, // Rounding error
  ])('Instances are scaled by the size parameter', ({ min, max, scaledMax, size }) => {
    stable.assert(
      stable.property(arbitraryGenParams(), arbitraryIterations(), ({ seed }, iterations) => {
        const g = dev.integer.scaleLinearly(min, max);

        const xs = toArray(
          pipe(
            g(seed, size),
            castToInstance(),
            map((r) => r.value),
            take(iterations),
          ),
        );

        expect(xs).not.toHaveLength(0);
        xs.forEach((x) => {
          expect(x).toBeLessThanOrEqual(scaledMax);
        });
      }),
    );
  });

  test('If size = 100, instances are uniformly distributed across the range', () => {
    const seed = Seed.spawn();
    const size = 100;
    const sampleSize = 1_000;
    const min = 0;
    const max = 10;
    const g = dev.integer.scaleLinearly(min, max);

    const xs = toArray(
      pipe(
        g(seed, size),
        castToInstance(),
        map((r) => r.value),
        take(sampleSize),
      ),
    );

    const { pValue } = analyzeUniformDistribution(min, max, xs);
    expect(pValue).toBeGreaterThanOrEqual(0.01);
  });
});
