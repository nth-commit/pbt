import { toArray, pipe } from 'ix/iterable';
import { take, filter, map } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';
import * as dev from '../src';

const isInstance = <T>(r: devCore.GenResult<T>): r is devCore.GenInstance<T> => r.kind === 'instance';

describe('integer', () => {
  test('It always generates an instance', () => {
    const seed = devCore.Seed.spawn();
    const size = 0;

    const xs = toArray(pipe(dev.integer()(seed, size), take(10)));

    expect(xs).not.toHaveLength(0);
    xs.forEach((x) => {
      expect(x.kind).toEqual('instance');
    });
  });

  test('An instance is always an integer', () => {
    const seed = devCore.Seed.spawn();
    const size = 0;

    const xs = toArray(
      pipe(
        dev.integer()(seed, size),
        filter(isInstance),
        map((r) => r.value),
        take(10),
      ),
    );

    expect(xs).not.toHaveLength(0);
    xs.forEach((x) => {
      expect(x).toEqual(Math.round(x));
    });
  });
});
