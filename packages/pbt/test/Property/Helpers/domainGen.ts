import fc from 'fast-check';
import { mersenne } from 'pure-rand';
import { empty, pipe } from 'ix/iterable';
import * as dev from '../../../src/Property';
import * as devGen from '../../../src/Gen';
import * as sharedDomainGen from '../../helpers/domainGen';
import { map } from 'ix/iterable/operators';

export type PropertyRunParams = {
  seed: dev.Seed;
  size: dev.Size;
  iterations: number;
};

export const seed = (): fc.Arbitrary<dev.Seed> => fc.nat().map(dev.Seed.create).noShrink();

export const size = (): fc.Arbitrary<dev.Size> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const iterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

export const runParams = (): fc.Arbitrary<PropertyRunParams> =>
  fc.tuple(seed(), size(), iterations()).map(([seed, size, iterations]) => ({ seed, size, iterations }));

export const gen = (): fc.Arbitrary<dev.Gen<unknown>> => fc.constant(devGen.naturalNumber.unscaled(10));

export const discardingGen = (): fc.Arbitrary<dev.Gen<unknown>> => gen().map((gen) => devGen.filter(gen, () => false));

export const gens = (): fc.Arbitrary<dev.Gen<unknown>[]> => fc.array(gen(), 0, 10);

export const infallibleFunc = (): fc.Arbitrary<dev.PropertyFunction<unknown[]>> =>
  fc.constantFrom(
    () => true,
    () => {},
  );

export const fallibleFunc = (): fc.Arbitrary<dev.PropertyFunction<unknown[]>> =>
  sharedDomainGen.func(
    fc.frequency(
      {
        weight: 2,
        arbitrary: fc.constant(true),
      },
      {
        weight: 1,
        arbitrary: fc.constant(false),
      },
    ),
  );

export const shuffle = <T>(arr: T[]): fc.Arbitrary<T[]> =>
  fc.array(fc.nat(), arr.length, arr.length).map((orders) =>
    arr
      .map((value, i) => ({ value: value, order: orders[i] }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.value),
  );
