import fc from 'fast-check';

export { func, gen, gens, fallibleFunc, infallibleFunc } from '../../helpers/domainGen';

export const seed = (): fc.Arbitrary<number> => fc.nat().noShrink();

export const size = (): fc.Arbitrary<number> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));
