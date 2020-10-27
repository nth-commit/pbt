import { pipe, toArray } from 'ix/iterable';
import { filter, map, take } from 'ix/iterable/operators';
import { Seed, Size } from '../src/Core';
import { Gen, GenIteration } from '../src/Gen2';

type SampleConfig = {
  seed: Seed | number;
  size: Size;
  iterations: number;
};

type SampleResult<T> = {
  values: T[];
  discards: number;
};

const sample = <T>(gen: Gen<T>, config: Partial<SampleConfig> = {}): SampleResult<T> => {
  const { seed, size, iterations }: SampleConfig = {
    seed: Seed.spawn(),
    size: 30,
    iterations: 100,
    ...config,
  };

  const values = toArray(
    pipe(
      gen.run(seed, size),
      filter(GenIteration.isInstance),
      map((iteration) => iteration.tree.node.value),
      take(iterations),
    ),
  );

  return {
    values,
    discards: 0,
  };
};

sample(Gen.integer(), { iterations: 5 }).values.forEach((x) => console.log(x));
