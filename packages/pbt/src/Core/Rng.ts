import { mersenne, uniformIntDistribution } from 'pure-rand';

// TODO: Investigate caching strategies, but should take some performance metrics first

export type Rng = {
  next(): Rng;
  value(min: number, max: number): number;
  readonly seed: number;
  readonly family: number;
  readonly order: number;
};

export namespace Rng {
  const createInternal = (seed: number, family: number, order: number): Rng => {
    const innerRng = mersenne(seed);

    const value = (min: number, max: number): number => uniformIntDistribution(min, max, innerRng)[0];

    return {
      next: () => {
        const nextSeed = value(innerRng.min(), innerRng.max());
        return createInternal(nextSeed, family, order + 1);
      },
      value,
      seed,
      family,
      order,
    };
  };

  export const create = (seed: number): Rng => createInternal(seed, seed, 0);

  export const spawn = () => create(Date.now());

  export const stream = function* (rng: Rng): Iterable<Rng> {
    do {
      yield rng;
      rng = rng.next();
    } while (true);
  };
}
