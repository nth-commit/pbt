import { toArray, pipe } from 'ix/iterable';
import { take, filter } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as devCore from 'pbt-core';
import { arbitraryGenerator, arbitraryGenParams, arbitraryIterations } from './helpers/arbitraries';
import { excludeShrink } from './helpers/iterableOperators';

test('It is repeatable', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, g) => {
        const iterate = () => toArray(pipe(g(seed, size), take(iterations), excludeShrink()));

        expect(iterate()).toEqual(iterate());
      },
    ),
  );
});

test('It shrinks to a different value', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, g) => {
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
