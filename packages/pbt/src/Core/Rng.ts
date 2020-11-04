import { mersenne, uniformIntDistribution } from 'pure-rand';

export type Rng = {
  next(): Rng;
  value(min: number, max: number): number;
  readonly seed: number;
};

const CACHE = new Map<number, Rng>();

export namespace Rng {
  export const create = (seed: number): Rng => {
    let rng = CACHE.get(seed);

    if (!rng) {
      const innerRng = mersenne(seed);

      const value = (min: number, max: number): number => uniformIntDistribution(min, max, innerRng)[0];

      rng = {
        next: () => create(value(innerRng.min(), innerRng.max())),
        value,
        seed,
      };

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
