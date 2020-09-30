import fc from 'fast-check';

export { func, gen, gens, fallibleFunc, infallibleFunc } from '../../helpers/domainGen';

export const seed = (): fc.Arbitrary<number> => fc.nat().noShrink();

export const size = (): fc.Arbitrary<number> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const counterexamplePath = (): fc.Arbitrary<string> => fc.array(fc.nat(), 0, 10).map((arr) => arr.join(':'));

export const maybe = <T>(gen: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.frequency({ weight: 3, arbitrary: gen }, { weight: 1, arbitrary: fc.constant(undefined) });
