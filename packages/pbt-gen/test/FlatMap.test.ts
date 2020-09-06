import { toArray, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator } from './helpers/arbitraries';

test('It can flatMap without throwing ¯_(ツ)_/¯', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, g) => {
        toArray(pipe(g.flatMap(() => g)(seed, size), take(iterations)));
      },
    ),
  );
});
