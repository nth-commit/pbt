import { toArray, pipe } from 'ix/iterable';
import { take, filter } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as devCore from 'pbt-core';
import { arbitraryGenerator, arbitraryGenParams, arbitraryIterations } from './helpers/arbitraries';
import { withoutShrinkFunction } from './helpers/iterableOperators';

test('It is repeatable', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, g) => {
        const iterate = () => toArray(pipe(g(seed, size), take(iterations), withoutShrinkFunction()));

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
        const instances = toArray(pipe(g(seed, size), take(iterations), filter(devCore.GenResult.isInstance)));

        instances.forEach((instance) => {
          Array.from(instance.shrink()).forEach((shrink) => {
            expect(shrink.value).not.toEqual(instance.value);
          });
        });
      },
    ),
  );
});
