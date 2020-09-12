import fc from 'fast-check';
import { Seed } from '../src';

test('It is repeatable', () => {
  fc.assert(
    fc.property(fc.nat(), (seeder) => {
      const seed = Seed.create(seeder);

      expect(seed.nextInt(0, 1_000_000)).toEqual(seed.nextInt(0, 1_000_000));
    }),
  );
});

test('It is repeatable after splitting', () => {
  fc.assert(
    fc.property(fc.nat(), fc.array(fc.constantFrom('L' as const, 'R' as const)), (seeder, splitPath) => {
      const seedFinal = splitPath.reduce((seed, splitDirection) => {
        const [leftSeed, rightSeed] = seed.split();
        switch (splitDirection) {
          case 'L':
            return leftSeed;
          case 'R':
            return rightSeed;
        }
      }, Seed.create(seeder));

      expect(seedFinal.nextInt(0, 1_000_000)).toEqual(seedFinal.nextInt(0, 1_000_000));
    }),
  );
});

test('It can be replicated', () => {
  fc.assert(
    fc.property(fc.nat(), (seeder) => {
      const seed0 = Seed.create(seeder);
      const seed1 = Seed.create(seed0.valueOf());

      expect(seed0.nextInt(0, 1_000_000)).toEqual(seed1.nextInt(0, 1_000_000));
    }),
  );
});
