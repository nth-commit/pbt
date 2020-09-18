import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { map, take } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator, arbitraryFunction } from './helpers/arbitraries';
import { castToInstance } from './helpers/iterableOperators';
import { GenInstance } from 'pbt-core';

test('It exhausts if the generator exhausts', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      fc.integer(0, 10),
      fc.integer(0, 10),
      ({ seed, size }, iterations, min, max) => {
        const g = dev.array.unscaled(min, max, dev.exhausted());

        const results = toArray(pipe(g(seed, size), take(iterations)));

        expect(results).toEqual([{ kind: 'exhaustion' }]);
      },
    ),
  );
});

test('It exhausts if the generator discards', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      fc.integer(1, 10),
      fc.integer(1, 10),
      ({ seed, size }, iterations, gInitial, min, max) => {
        const g = dev.array.unscaled(
          min,
          max,
          gInitial.filter(() => false),
        );

        const results = toArray(pipe(g(seed, size), take(iterations)));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(result).toEqual({ kind: 'discard' });
        });
      },
    ),
  );
});

test('Snapshot', () => {
  const seed = devCore.Seed.create(1);
  const iterationsBySize = new Map<number, number>([
    [0, 1],
    [20, 2],
    [50, 2],
    [100, 1],
  ]);
  const g = dev.array.scaleLinearly(0, 4, dev.integer.scaleLinearly(0, 2)).map((xs) => `[${xs.join(',')}]`);

  for (const [size, iterations] of iterationsBySize.entries()) {
    const results = toArray(pipe(g(seed, size), castToInstance(), map(GenInstance.format), take(iterations)));

    results.forEach((result, i) => expect(result).toMatchSnapshot(`size=${size} iteration=${i + 1}`));
  }
});
