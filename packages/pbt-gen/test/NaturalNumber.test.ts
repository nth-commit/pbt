import fc from 'fast-check';
import { toArray, pipe, first, last, count } from 'ix/iterable';
import { take, map } from 'ix/iterable/operators';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryNaturalNumber, arbitrarySize } from './helpers/arbitraries';
import { analyzeUniformDistribution } from './helpers/statistics';
import { castToInstance } from './helpers/iterableOperators';
import { Seed } from 'pbt-core';

type GeneralizedNaturalNumberGenFactory = (max?: number) => dev.Gen<number>;

const arbitraryNaturalNumberGenFactory = (): fc.Arbitrary<GeneralizedNaturalNumberGenFactory> =>
  fc.constantFrom(...Object.values(dev.naturalNumber));

test('It always generates an instance', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryNaturalNumberGenFactory(),
      ({ seed, size }, iterations, gFactory) => {
        const g = gFactory();

        const xs = toArray(pipe(g(seed, size), take(iterations)));

        expect(xs).not.toHaveLength(0);
        xs.forEach((x) => {
          expect(x.kind).toEqual('instance');
        });
      },
    ),
  );
});

test('Instances are natual numbers', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryNaturalNumberGenFactory(),
      ({ seed, size }, iterations, gFactory) => {
        const g = gFactory();

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
          expect(x).toBeGreaterThanOrEqual(0);
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
      arbitraryNaturalNumber(),
      arbitraryNaturalNumberGenFactory(),
      ({ seed, size }, iterations, max, gFactory) => {
        const g = gFactory(max);

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
          expect(x).toBeLessThanOrEqual(max);
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
      arbitraryNaturalNumber(),
      arbitraryNaturalNumberGenFactory(),
      ({ seed, size }, iterations, max, gFactory) => {
        const g = gFactory(max);

        const instances = toArray(pipe(g(seed, size), castToInstance(), take(iterations)));

        expect(instances).not.toHaveLength(0);
        instances.forEach((instance) => {
          const shrinks = instance.shrink();

          if (instance.value !== 0) {
            expect(count(shrinks)).toBeGreaterThanOrEqual(1);
          }

          if (count(shrinks) >= 1) {
            expect(first(shrinks)!.value).toEqual(0);
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
        const g = dev.naturalNumber.unscaled(max);

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
        arbitraryNaturalNumber(),
        ({ seed }, iterations, max) => {
          const size = 0;
          const g = dev.naturalNumber.scaleLinearly(max);

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
            expect(x).toEqual(0);
          });
        },
      ),
    );
  });

  test.each([
    { max: 10, size: 50, scaledMax: 5 },
    { max: 20, size: 50, scaledMax: 10 },
  ])('Instances are scaled by the size parameter', ({ max, scaledMax, size }) => {
    stable.assert(
      stable.property(arbitraryGenParams(), arbitraryIterations(), ({ seed }, iterations) => {
        const g = dev.naturalNumber.scaleLinearly(max);

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
    const g = dev.naturalNumber.scaleLinearly(max);

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
