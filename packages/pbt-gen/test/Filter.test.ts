import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as stable from './helpers/stableApi';
import * as dev from '../src';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator, arbitraryFunction } from './helpers/arbitraries';
import { excludeShrink } from './helpers/iterableOperators';

test('It is always a no-op with a true predicate', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, gInitial) => {
        const gFiltered = gInitial.filter(() => true);

        const iterate = <T>(g: dev.Gen<T>) => toArray(pipe(g(seed, size), take(iterations), excludeShrink()));

        expect(iterate(gFiltered)).toEqual(iterate(gInitial));
      },
    ),
  );
});

test('It always generates a discard with a false predicate', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, gInitial) => {
        const gFiltered = gInitial.filter(() => false);

        const results = toArray(pipe(gFiltered(seed, size), take(iterations)));

        expect(results).toHaveLength(iterations);
        results.forEach((iteration) => {
          expect(iteration).toEqual({ kind: 'discard' });
        });
      },
    ),
  );
});

test('It behaves like Array.prototype.filter', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryFunction(fc.boolean()),
      ({ seed, size }, iterations, gInitial, pred) => {
        const gFiltered = gInitial.filter(pred);

        const iterate = <T>(g: dev.Gen<T>) => toArray(pipe(g(seed, size), take(iterations)));

        const resultsFilteredByGen = iterate(gFiltered)
          .filter(devCore.GenResult.isInstance)
          .map((r) => r.value);

        const resultsFilteredByArray = iterate(gInitial)
          .filter(devCore.GenResult.isInstance)
          .map((r: devCore.GenInstance<unknown>) => r.value)
          .filter((x) => pred(x));

        expect(resultsFilteredByGen).toEqual(resultsFilteredByArray);
      },
    ),
  );
});
