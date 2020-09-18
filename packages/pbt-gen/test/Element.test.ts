import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryRecord } from './helpers/arbitraries';
import { castToInstance } from './helpers/iterableOperators';

test('It exhausts if the collection is empty', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      fc.constantFrom([], {}, new Set(), new Map()),
      ({ seed, size }, iterations) => {
        const g = dev.element([]);

        const results = toArray(pipe(g(seed, size), take(iterations)));

        expect(results).toEqual([{ kind: 'exhaustion' }]);
      },
    ),
  );
});

test('It returns an element in the array', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      fc.array(fc.anything(), 1, 20),
      ({ seed, size }, iterations, arr) => {
        const g = dev.element(arr);

        const results = toArray(pipe(g(seed, size), take(iterations), castToInstance()));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(arr).toContainEqual(result.value);
        });
      },
    ),
  );
});

test('It returns an element in the record', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryRecord(fc.string(), fc.anything()).filter((x) => Object.entries(x).length > 0),
      ({ seed, size }, iterations, record) => {
        const g = dev.element(record);

        const results = toArray(pipe(g(seed, size), take(iterations), castToInstance()));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(Object.values(record)).toContainEqual(result.value);
        });
      },
    ),
  );
});

test('It returns an element in the set', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      fc.set(fc.anything(), 1, 20).map((x) => new Set(x)),
      ({ seed, size }, iterations, set) => {
        const g = dev.element(set);

        const results = toArray(pipe(g(seed, size), take(iterations), castToInstance()));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(set).toContainEqual(result.value);
        });
      },
    ),
  );
});

test('It returns an element in the map', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      fc.array(fc.tuple(fc.anything(), fc.anything()), 1, 20).map((entries) => new Map(entries)),
      ({ seed, size }, iterations, map) => {
        const g = dev.element(map);

        const results = toArray(pipe(g(seed, size), take(iterations), castToInstance()));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(map.values()).toContainEqual(result.value);
        });
      },
    ),
  );
});
