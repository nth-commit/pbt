/* istanbul ignore file */
import { mersenne, uniformIntDistribution, RandomGenerator } from 'pure-rand';

export type Seed = {
  nextInt(min: number, max: number): number;
  split(): [Seed, Seed];
  valueOf(): number;
  toString(): string;
};

export namespace Seed {
  const makeSeed = (makeRandom: (seeder: number) => RandomGenerator) => {
    const innerMakeSeed = (seeder: number): Seed => {
      const r0 = makeRandom(seeder);
      return {
        nextInt: (min: number, max: number): number => {
          const actualMin = min < max ? min : max;
          const actualMax = max > min ? max : min;
          return uniformIntDistribution(actualMin, actualMax, r0)[0];
        },
        split: () => {
          const [i, r1] = r0.next();
          const [j] = r1.next();
          return [innerMakeSeed(i), innerMakeSeed(j)];
        },
        valueOf: () => seeder,
        toString: () => ({}.toString()),
      };
    };

    return innerMakeSeed;
  };

  export const create = (seeder: number): Seed => makeSeed(mersenne)(seeder);

  export const spawn = (): Seed => create(Math.round(Math.random() * 1_000_000));
}
