import fc from 'fast-check';
import { toArray, pipe, first } from 'ix/iterable';
import { take, map } from 'ix/iterable/operators';
import * as dev from '../src';
import * as devCore from 'pbt-core';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryInteger } from './helpers/arbitraries';
import { calculateProbabilityOfUniformDistribution } from './helpers/statistics';
import { castToInstance } from './helpers/iterableOperators';

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

        const iterate = (g: dev.Gen<number>) => toArray(pipe(g(seed, size), take(iterations)));

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

describe('Constant', () => {
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
            castToInstance(),
            map((r) => r.value),
            take(iterations),
          ),
        );

        const { pValue } = calculateProbabilityOfUniformDistribution(min, max, xs);
        expect(pValue).toBeGreaterThanOrEqual(0.001);
      }),
    );
  });

  test('Instances do not shrink', () => {
    const arbIterations = arbitraryIterations()
      .noShrink()
      .filter((x) => x > 50);

    stable.assert(
      stable.property(arbitraryGenParams(), arbIterations, ({ seed, size }, iterations) => {
        const min = 0;
        const max = 10;
        const g = dev.integer.constant(min, max);

        const instances = toArray(pipe(g(seed, size), castToInstance(), take(iterations)));

        expect(instances).not.toHaveLength(0);
        instances.forEach((instance) => {
          expect(toArray(instance.shrink())).toHaveLength(0);
        });
      }),
    );
  });
});

describe('Linear', () => {
  test('With an origin outside the bounds, it exhausts', () => {
    const arbitraryOutOfBoundsOrigin = (): fc.Arbitrary<[min: number, max: number, origin: number]> =>
      fc
        .tuple(
          arbitraryInteger(),
          arbitraryInteger(),
          arbitraryInteger().filter((x) => x !== 0),
        )
        .map(([x, y, diff]) => {
          const min = x < y ? x : y;
          const max = x > y ? x : y;
          const origin = diff > 0 ? max + diff : min + diff;
          return [min, max, origin];
        });

    stable.assert(
      stable.property(arbitraryGenParams(), arbitraryOutOfBoundsOrigin(), ({ seed, size }, [min, max, origin]) => {
        const g = dev.integer.linear(min, max, origin);

        const result = first(pipe(g(seed, size), take(1))) as devCore.GenResult<number>;

        expect(result).toEqual({ kind: 'exhaustion' });
      }),
    );
  });
});
