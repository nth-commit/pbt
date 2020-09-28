import { last, pipe } from 'ix/iterable';
import { Seed } from '../Core';
import { takeWhileInclusive } from '../Gen';
import { Property, PropertyResult } from './Property';

export type CheckConfig = {
  iterations: number;
  seed: number;
  size: number;
  counterexamplePath: string | undefined;
};

export const check = <Values extends any[]>(
  property: Property<Values>,
  config: Partial<CheckConfig> = {},
): PropertyResult<Values> => {
  const seed = config.seed === undefined ? Seed.spawn().valueOf() : config.seed;
  const size = config.size === undefined ? 0 : config.size;

  const iterable = property.configure({ counterexamplePath: config.counterexamplePath }).run(seed, size);

  const requestedIterations = config.iterations === undefined ? 100 : config.iterations;
  const propertyResult = last(
    pipe(
      iterable,
      takeWhileInclusive((x) => x.iterations < requestedIterations),
    ),
  )!;

  return propertyResult;
};
