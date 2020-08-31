import { mersenne, uniformIntDistribution, RandomGenerator } from 'pure-rand';

export type Seed = {
  nextInt(min: number, max: number): number;
  split(): [Seed, Seed];
};

export namespace Seed {
  const makeSeed = (r0: RandomGenerator): Seed => ({
    nextInt: (min: number, max: number): number => uniformIntDistribution(min, max, r0)[0],
    split: () => {
      const [i, r1] = r0.next();
      const [j] = r1.next();
      return [makeSeed(mersenne(i)), makeSeed(mersenne(j))];
    },
  });

  export const create = (seeder: number): Seed => makeSeed(mersenne(seeder));

  export const spawn = (): Seed => create(new Date().getTime());
}
