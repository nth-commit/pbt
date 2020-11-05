import { mersenne, uniformIntDistribution } from 'pure-rand';

export type Rng = {
  next(): Rng;
  value(min: number, max: number): number;
  readonly seed: number;
  toString(): string;
};

const CACHE = new Map<number, Rng>();

export namespace Rng {
  export const create = (seed: number, prevRng?: Rng): Rng => {
    let rng = CACHE.get(seed);

    if (!rng) {
      const innerRng = mersenne(seed);

      const value = (min: number, max: number): number => uniformIntDistribution(min, max, innerRng)[0];

      rng = {
        next: () => {
          const nextSeed = value(innerRng.min(), innerRng.max());
          return create(nextSeed, rng);
        },
        value,
        seed,
        toString: () => {
          const fullSeedStr = seed.toString();
          if (fullSeedStr.length <= 3) return fullSeedStr;
          return `${fullSeedStr.slice(0, 3)}`;
        },
      };

      console.log(`seed:create:${rng} (from: ${prevRng})`);

      CACHE.set(seed, rng);
    }

    return rng;
  };

  export const spawn = () => create(Date.now());

  export const stream = function* (rng: Rng): Iterable<Rng> {
    do {
      yield rng;
      rng = rng.next();
    } while (true);
  };
}
