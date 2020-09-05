import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { take, filter, map } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import { arbitraryFunction, arbitraryGenParams, arbitraryIterations, arbitraryGenerator } from './helpers/arbitraries';

test('It maps like an array', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryFunction(fc.anything()),
      ({ seed, size }, iterations, gInitial, f) => {
        const gMapped = gInitial.map(f);

        const iterate = <T>(g: dev.Gen<T>) =>
          toArray(
            pipe(
              g(seed, size),
              filter(devCore.GenResult.isInstance),
              map((r) => r.value),
              take(iterations),
            ),
          );

        expect(iterate(gMapped)).toEqual(iterate(gInitial).map(f));
      },
    ),
  );
});

const traverseInstance = <T>(instance: devCore.GenInstanceData<T>, recursionLimit: number): T[] => {
  if (recursionLimit <= 0) return [];

  return Array.prototype.concat(
    [instance.value],
    ...Array.from(instance.shrink()).map((shrink) => traverseInstance(shrink, recursionLimit - 1)),
  ) as T[];
};

test('It maps the shrinks', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      fc.anything(),
      ({ seed, size }, iterations, gInitial, mappedValue) => {
        const gMapped = gInitial.map(() => mappedValue);

        const instances = toArray(pipe(gMapped(seed, size), filter(devCore.GenResult.isInstance), take(iterations)));

        expect(instances).not.toHaveLength(0);
        instances.forEach((instance) => {
          const values = traverseInstance(instance, 10);
          expect(values).not.toHaveLength(0);
          values.forEach((value) => {
            expect(value).toBe(mappedValue);
          });
        });
      },
    ),
  );
});
