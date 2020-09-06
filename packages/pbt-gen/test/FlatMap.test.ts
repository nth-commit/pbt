import { toArray, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import { exhausted } from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams, arbitraryIterations, arbitraryGenerator, arbitraryFunction } from './helpers/arbitraries';

test('It can flatMap without throwing ¯\\_(ツ)_/¯', () => {
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

test('It exhausts if the left generator exhausts', () => {
  stable.assert(
    stable.property(arbitraryGenParams(), arbitraryFunction(arbitraryGenerator(), 1), ({ seed, size }, k) => {
      const gLeft = exhausted();
      const g = gLeft.flatMap(k);

      const results = toArray(pipe(g(seed, size)));

      expect(results).toEqual([{ kind: 'exhaustion' }]);
    }),
  );
});

test('It exhausts if the right generator exhausts', () => {
  stable.assert(
    stable.property(arbitraryGenParams(), arbitraryGenerator(), ({ seed, size }, gLeft) => {
      const g = gLeft.flatMap(() => exhausted());

      const results = toArray(pipe(g(seed, size), take(2)));

      expect(results).toEqual([{ kind: 'exhaustion' }]);
    }),
  );
});
