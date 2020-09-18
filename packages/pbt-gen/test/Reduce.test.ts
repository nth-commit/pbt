import fc from 'fast-check';
import { toArray, pipe, first } from 'ix/iterable';
import { map, take } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator, arbitraryFunction } from './helpers/arbitraries';
import { castToInstance } from './helpers/iterableOperators';
import { GenInstance } from 'pbt-core';

const abritraryReducer = () => arbitraryFunction(fc.anything(), 2);

const arbitraryReduceParams = (): fc.Arbitrary<[length: number, f: (...args: any[]) => unknown, init: unknown]> =>
  fc.tuple(arbitraryIterations(), abritraryReducer(), fc.anything());

test('It exhausts if the generator exhausts', () => {
  stable.assert(
    stable.property(arbitraryGenParams(), arbitraryReduceParams(), ({ seed, size }, reducerParams) => {
      const g = dev.exhausted().reduce(...reducerParams);

      const results = toArray(pipe(g(seed, size)));

      expect(results).toEqual([{ kind: 'exhaustion' }]);
    }),
  );
});

test('It discards if the generator discards', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryReduceParams(),
      ({ seed, size }, iterations, gInitial, reducerParams) => {
        const g = gInitial.filter(() => false).reduce(...reducerParams);

        const results = toArray(pipe(g(seed, size), take(iterations)));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(result).toEqual({ kind: 'discard' });
        });
      },
    ),
  );
});

test('It behaves like Array.prototype.reduce', () => {
  stable.assert(
    stable.property(arbitraryGenParams(), arbitraryReduceParams(), ({ seed, size }, reducerParams) => {
      // The generator cannot be a higher-order generator, as that will consume more of the seed, and make it
      // "unreproducible" (lol) as an array reduce.
      const g = dev.integer.unscaled(0, 10);

      const reducedByGen = first(
        pipe(
          g.reduce(...reducerParams)(seed, size),
          castToInstance(),
          map((r) => r.value),
        ),
      )!;

      const reducedByArray = toArray(
        pipe(
          // Seed requires an extra split, to reproduce the initial split inside of Gen.reduce
          g(seed.split()[0], size),
          take(reducerParams[0]),
          castToInstance(),
          map((r) => r.value),
        ),
      ).reduce(reducerParams[1], reducerParams[2]);

      expect(reducedByGen).toEqual(reducedByArray);
    }),
  );
});

test('Snapshot', () => {
  // A gen.reduce shrinks by shrinking each of the elements consumed by the original generator, and piping them
  // through the reducer function. The original elements are shrunk in isolation, from left-to-right, recursively.
  // This means we will shrink the first element to the smallest possible size which reproduces the counterexample
  // with the rest of the elements at their original size. Then, we will shrink the second. etc.

  const seed = devCore.Seed.create(0);
  const iterationsBySize = new Map<number, number>([
    [0, 1],
    [20, 2],
    [50, 5],
  ]);
  const g = dev.integer
    .scaleLinearly(0, 3)
    .reduce<number[]>(3, (acc, x) => [...acc, x], [])
    .map((xs) => `[${xs.join(',')}]`);

  for (const [size, iterations] of iterationsBySize.entries()) {
    const results = toArray(pipe(g(seed, size), castToInstance(), map(GenInstance.format), take(iterations)));

    results.forEach((result, i) => expect(result).toMatchSnapshot(`size=${size} iteration=${i + 1}`));
  }
});
