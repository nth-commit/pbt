import { Seed } from './Imports';

export const stream = function* (initialSeed: Seed): Iterable<Seed> {
  let currentSeed = initialSeed;
  while (true) {
    const [leftSeed, rightSeed] = currentSeed.split();
    yield leftSeed;
    currentSeed = rightSeed;
  }
};