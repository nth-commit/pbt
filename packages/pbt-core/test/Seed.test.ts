import * as dev from '../src';
import { assert, property, gen } from 'pbt-0.0.1';

test('It is repeatable', () => {
  assert(
    property(gen.naturalNumber.unscaled().noShrink(), (seeder) => {
      const seed = dev.Seed.create(seeder);

      expect(seed.nextInt(0, 1_000_000)).toEqual(seed.nextInt(0, 1_000_000));
    }),
  );
});

test('It is repeatable after splitting', () => {
  assert(
    property(
      gen.naturalNumber.unscaled().noShrink(),
      gen.array.scaleLinearly(0, 10, gen.element(['L', 'R'] as const)),
      (seeder, splitPath) => {
        const seedFinal = splitPath.reduce((seed, splitDirection) => {
          const [leftSeed, rightSeed] = seed.split();
          switch (splitDirection) {
            case 'L':
              return leftSeed;
            case 'R':
              return rightSeed;
          }
        }, dev.Seed.create(seeder));

        expect(seedFinal.nextInt(0, 1_000_000)).toEqual(seedFinal.nextInt(0, 1_000_000));
      },
    ),
  );
});

test('It can be replicated', () => {
  assert(
    property(gen.naturalNumber.unscaled().noShrink(), (seeder) => {
      const seed0 = dev.Seed.create(seeder);
      const seed1 = dev.Seed.create(seed0.valueOf());

      expect(seed0.nextInt(0, 1_000_000)).toEqual(seed1.nextInt(0, 1_000_000));
    }),
  );
});
