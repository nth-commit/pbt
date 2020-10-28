import { Seed } from '../srcShim';

export const loggingSeedDecorator = (seed: Seed, idPath: Array<'L' | 'R'> = []): Seed => {
  const id = idPath.join(':');

  const log = (msg: string) => {
    console.log(`Seed[${id}] - ${msg}`);
  };

  const seed0: Seed = {
    nextInt: (min, max) => {
      const x = seed.nextInt(min, max);
      log(`nextInt(${min}, ${max}) => ${x}`);
      return x;
    },
    split: () => {
      log(`split()`);
      return seed.split().map((s, i) => loggingSeedDecorator(s, [...idPath, i === 0 ? 'L' : 'R'])) as [Seed, Seed];
    },
    toString: () => seed.toString(),
    valueOf: () => seed.valueOf(),
  };

  return Object.assign(seed0, { _id: id });
};
