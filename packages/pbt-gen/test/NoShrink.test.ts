import { toArray, pipe } from 'ix/iterable';
import { take, filter } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import * as devCore from 'pbt-core';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator } from './helpers/arbitraries';

test('It removes the shrinks', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, gInitial) => {
        const g = gInitial.noShrink();

        const instances = toArray(pipe(g(seed, size), take(iterations), filter(devCore.GenResult.isInstance)));

        instances.forEach((instance) => {
          const sampledShrinks = toArray(take(10)(instance.shrink()));
          expect(sampledShrinks).toHaveLength(0);
        });
      },
    ),
  );
});
