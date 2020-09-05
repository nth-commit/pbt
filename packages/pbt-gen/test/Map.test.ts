import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { take, map, filter } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import { arbitraryFunction, arbitraryGenParams, arbitraryIterations, arbitraryGenerator } from './helpers/arbitraries';
import { traverseShrinks } from './helpers/traverseShrinks';
import { castToInstance } from './helpers/iterableOperators';

test('It behaves like Array.prototype.map', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryFunction(fc.anything(), 1),
      ({ seed, size }, iterations, gInitial, f) => {
        const gMapped = gInitial.map(f);

        const iterate = <T>(g: dev.Gen<T>) =>
          toArray(
            pipe(
              g(seed, size),
              take(iterations),
              filter(devCore.GenResult.isInstance),
              map((r) => r.value),
            ),
          );

        expect(iterate(gMapped)).toEqual(iterate(gInitial).map(f));
      },
    ),
  );
});

test('It maps the shrinks', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      fc.anything(),
      ({ seed, size }, iterations, gInitial, mappedValue) => {
        const gMapped = gInitial.map(() => mappedValue);

        const instances = toArray(pipe(gMapped(seed, size), take(iterations), filter(devCore.GenResult.isInstance)));

        instances.forEach((instance) => {
          const values = traverseShrinks(instance, 10);
          expect(values).not.toHaveLength(0);
          values.forEach((value) => {
            expect(value).toBe(mappedValue);
          });
        });
      },
    ),
  );
});
