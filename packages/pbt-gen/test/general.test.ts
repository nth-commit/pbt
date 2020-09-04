import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { take, filter, map } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import { arbitraryFunction, arbitraryGenParams, arbitraryIterations } from './helpers/arbitraries';
import { excludeShrink } from './helpers/iterableOperators';

const generatorByName = {
  'integer.constant': dev.integer.constant(-1000, 1000),
  'integer.linear': dev.integer.linear(-1000, 1000),
};

const arbitraryGeneratorKey = (): fc.Arbitrary<keyof typeof generatorByName> =>
  fc.constantFrom(...(Object.keys(generatorByName) as Array<keyof typeof generatorByName>));

test('It is repeatable', () => {
  stable.assert(
    stable.property(
      arbitraryGeneratorKey(),
      arbitraryGenParams(),
      arbitraryIterations(),
      (name, { seed, size }, iterations) => {
        const g = generatorByName[name];

        const iterate = () => toArray(pipe(g(seed, size), take(iterations), excludeShrink()));

        expect(iterate()).toEqual(iterate());
      },
    ),
  );
});

test('It shrinks to a different value', () => {
  stable.assert(
    stable.property(
      arbitraryGeneratorKey(),
      arbitraryGenParams(),
      arbitraryIterations(),
      (name, { seed, size }, iterations) => {
        const g = generatorByName[name];

        const instances = toArray(pipe(g(seed, size), filter(devCore.GenResult.isInstance), take(iterations)));

        expect(instances).not.toHaveLength(0);
        instances.forEach((instance) => {
          Array.from(instance.shrink()).forEach((shrink) => {
            expect(shrink.value).not.toEqual(instance.value);
          });
        });
      },
    ),
  );
});

test('It maps like an array', () => {
  stable.assert(
    stable.property(
      arbitraryGeneratorKey(),
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryFunction(fc.anything()),
      (name, { seed, size }, iterations, f) => {
        const gInitial = generatorByName[name];
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
