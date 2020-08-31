import { toArray, pipe } from 'ix/iterable';
import { take, filter, map } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitraryGenParams } from './helpers/arbitraries';

describe('integer', () => {
  test('It always generates an instance', () => {
    stable.assert(
      stable.property(arbitraryGenParams(), ({ seed, size }) => {
        const xs = toArray(pipe(dev.integer()(seed, size), take(10)));

        expect(xs).not.toHaveLength(0);
        xs.forEach((x) => {
          expect(x.kind).toEqual('instance');
        });
      }),
    );
  });

  test('An instance is always an integer', () => {
    stable.assert(
      stable.property(arbitraryGenParams(), ({ seed, size }) => {
        const xs = toArray(
          pipe(
            dev.integer()(seed, size),
            filter(devCore.GenResult.isInstance),
            map((r) => r.value),
            take(10),
          ),
        );

        expect(xs).not.toHaveLength(0);
        xs.forEach((x) => {
          expect(x).toEqual(Math.round(x));
        });
      }),
    );
  });
});
