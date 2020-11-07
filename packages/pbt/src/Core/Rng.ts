import { mersenne, uniformIntDistribution } from 'pure-rand';

export type Rng = {
  next(): Rng;
  value(min: number, max: number): number;
  readonly seed: number;
  readonly family: number;
  readonly order: number;
  toString(): string;
};

const CACHE = new Map<number, Rng>();

export namespace Rng {
  const createInternal = (seed: number, family: number, order: number): Rng => {
    let rng = CACHE.get(seed);

    if (!rng) {
      const innerRng = mersenne(seed);

      const value = (min: number, max: number): number => uniformIntDistribution(min, max, innerRng)[0];

      rng = {
        next: () => {
          const nextSeed = value(innerRng.min(), innerRng.max());
          return createInternal(nextSeed, family, order + 1);
        },
        value,
        seed,
        family,
        order,
        toString: () => {
          const fullSeedStr = seed.toString();
          if (fullSeedStr.length <= 3) return fullSeedStr;
          return `${fullSeedStr.slice(0, 3)}`;
        },
      };

      // console.log(`seed:create:${rng} (from: ${prevRng})`);

      CACHE.set(seed, rng);
    }

    return rng;
  };

  export const create = (seed: number): Rng => createInternal(seed, seed, 0);

  export const spawn = () => create(Date.now());

  export const rangeLazy = function* (start: Rng, end: Rng): Iterable<Rng> {
    if (start.family !== end.family) {
      throw 'Fatal: Cannot create range from two unrelated RNGs';
    }

    if (start.order > end.order) {
      // TODO: There may be a use-case for making this resilient, but at the moment it's probably a programming error.
      throw 'Fatal: End was greater than start';
    }

    let breaker = 0;
    while (start.seed !== end.seed) {
      breaker++;
      if (breaker > 100) {
        throw 'break';
      }

      yield start;
      start = start.next();
    }
    yield start;
  };

  export const range = (start: Rng, end: Rng): Rng[] => Array.from(rangeLazy(start, end));

  export const stream = function* (rng: Rng): Iterable<Rng> {
    do {
      yield rng;
      rng = rng.next();
    } while (true);
  };
}
