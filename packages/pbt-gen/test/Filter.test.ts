import { toArray, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as dev from '../src';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator } from './helpers/arbitraries';
import { excludeShrink } from './helpers/iterableOperators';

test('Filtering with a true predicate is a no-op', () => {
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

test('Filtering with a false predicate always generates a discard', () => {
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
