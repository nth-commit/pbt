import { last, pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import { Gen, GenTree, Seed, Shrink, takeWhileInclusive } from '../src/Gen2';
import { Property, explore, PropertyResult } from '../src/Property2';

// const tree = GenTree.unfold(
//   [3, 2, 1],
//   (x) => x,
//   Shrink.array(0),
//   () => 0,
// );

// console.log(GenTree.format(tree));

export type CheckConfig = {
  iterations: number;
  seed: Seed | number;
  size: number;
  counterexamplePath: string | undefined;
};

const check = <Values extends any[]>(
  property: Property<Values>,
  config: Partial<CheckConfig> = {},
): PropertyResult<Values> => {
  const seed =
    config.seed === undefined ? Seed.spawn() : typeof config.seed === 'number' ? Seed.create(config.seed) : config.seed;
  const size = config.size === undefined ? 0 : config.size;

  const iterable = property(seed, size);

  const requestedIterations = config.iterations === undefined ? 100 : config.iterations;
  const propertyResult = last(
    pipe(
      iterable,
      takeWhileInclusive((x) => x.iterations < requestedIterations),
    ),
  )!;

  return propertyResult;
};

const p = explore([Gen.array(Gen.array(Gen.naturalNumber(10)))], (xss) => {
  const set = new Set<number>();
  for (const xs of xss) {
    for (const x of xs) {
      set.add(x);
    }
  }
  return set.size < 5;
});

console.log(JSON.stringify(check(p), (key, value) => (key === 'counterexamplePath' ? undefined : value), 2));
