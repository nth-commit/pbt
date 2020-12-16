import { mersenne, uniformIntDistribution } from 'pure-rand';
import { Calculator, Integer } from './Calculator';

// TODO: Investigate caching strategies, but should take some performance metrics first

export type Rng = {
  next(): Rng;
  value<TNumber>(calculator: Calculator<TNumber>, min: Integer<TNumber>, max: Integer<TNumber>): Integer<TNumber>;
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
      value: (calculator, min, max) => {
        const minUnloaded = calculator.unloadInteger(min);
        const maxUnloaded = calculator.unloadInteger(max);
        return calculator.loadIntegerUnchecked(value(minUnloaded, maxUnloaded));
      },
      seed,
      family,
      order,
    };
  };

  export const create = (seed: number): Rng => createInternal(seed, seed, 0);

  export const stream = function* (rng: Rng): Iterable<Rng> {
    do {
      yield rng;
      rng = rng.next();
    } while (true);
  };
}
