import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { filter, map, take } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as stable from './helpers/stableApi';
import * as dev from '../src';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator, arbitraryPredicate } from './helpers/arbitraries';
import { withoutShrinkFunction } from './helpers/iterableOperators';
import { traverseShrinks } from './helpers/traverseShrinks';

test('It is a no-op with a true predicate', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, gInitial) => {
        const gFiltered = gInitial.filter(() => true);

        const iterate = <T>(g: dev.Gen<T>) => toArray(pipe(g(seed, size), take(iterations), withoutShrinkFunction()));

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
      arbitraryPredicate(1),
      ({ seed, size }, iterations, gInitial, pred) => {
        const gFiltered = gInitial.filter(pred);

        const iterate = <T>(g: dev.Gen<T>) =>
          toArray(
            pipe(
              g(seed, size),
              take(iterations),
              filter(devCore.GenResult.isInstance),
              map((r) => r.value),
            ),
          );

        expect(iterate(gFiltered)).toEqual(iterate(gInitial).filter(pred));
      },
    ),
  );
});

test('It filters the shrinks', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryPredicate(1),
      ({ seed, size }, iterations, gInitial, pred) => {
        const gFiltered = gInitial.filter(pred);

        const results = toArray(pipe(gFiltered(seed, size), take(iterations)));

        expect(results).toHaveLength(iterations);
        results.filter(devCore.GenResult.isInstance).forEach((instance) => {
          const values = traverseShrinks(instance, 10);
          expect(values).not.toHaveLength(0);
          values.forEach((value) => {
            expect(pred(value)).toEqual(true);
          });
        });
      },
    ),
  );
});
