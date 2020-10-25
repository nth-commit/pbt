import fc from 'fast-check';
import * as dev from '../srcShim';
import { RunParams } from './RunParams';

export { fallibleFunc, infallibleFunc } from '../../helpers/domainGen';

export const seed = () => fc.nat().noShrink();

export const size = (): fc.Arbitrary<dev.Size> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const iterations = (): fc.Arbitrary<number> => fc.integer(1, 100);

export const runParams = (): fc.Arbitrary<RunParams> =>
  fc.tuple(seed(), size(), iterations()).map(([seed, size, iterations]) => ({ seed, size, iterations }));

export const gens = (): fc.Arbitrary<dev.Gen<unknown>[]> => fc.constant([]);
