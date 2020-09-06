import fc from 'fast-check';
import { toArray, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import {
  arbitraryGenParams,
  arbitraryIterations,
  arbitraryGenerator,
  arbitraryFunction,
  arbitraryFullGenerator,
} from './helpers/arbitraries';

const arbitraryGenFlatMapper = <T>(): fc.Arbitrary<(x: T) => dev.Gen<unknown>> =>
  arbitraryFunction<dev.Gen<unknown>>(arbitraryGenerator(), 1);

test('It exhausts if the left generator exhausts', () => {
  stable.assert(
    stable.property(arbitraryGenParams(), arbitraryGenFlatMapper(), ({ seed, size }, k) => {
      const gLeft = dev.exhausted();
      const g = gLeft.flatMap(k);

      const results = toArray(pipe(g(seed, size)));

      expect(results).toEqual([{ kind: 'exhaustion' }]);
    }),
  );
});

test('It exhausts if the right generator exhausts', () => {
  stable.assert(
    stable.property(arbitraryGenParams(), arbitraryFullGenerator(), ({ seed, size }, gLeft) => {
      const g = gLeft.flatMap(() => dev.exhausted());

      const results = toArray(pipe(g(seed, size), take(3)));

      expect(results).toEqual([{ kind: 'exhaustion' }]);
    }),
  );
});

test('It discards when the left generator discards', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryGenFlatMapper(),
      ({ seed, size }, iterations, gLeft, k) => {
        const g = gLeft.filter(() => false).flatMap(k);

        const results = toArray(pipe(g(seed, size), take(iterations)));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(result).toEqual({ kind: 'discard' });
        });
      },
    ),
  );
});

test('It discards when the right generator discards', () => {
  stable.assert(
    stable.property(
      arbitraryGenParams(),
      arbitraryIterations(),
      arbitraryGenerator(),
      arbitraryGenerator(),
      ({ seed, size }, iterations, gLeft, gRight) => {
        const g = gLeft.flatMap(() => gRight.filter(() => false));

        const results = toArray(pipe(g(seed, size), take(iterations)));

        expect(results).toHaveLength(iterations);
        results.forEach((result) => {
          expect(result).toEqual({ kind: 'discard' });
        });
      },
    ),
  );
});
