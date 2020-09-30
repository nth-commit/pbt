import fc from 'fast-check';
import * as dev from '../../../src/Public';
import { FilterPropertyResultByKind } from './PropertyResultHelpers';

export { func, gen, gens, fallibleFunc, infallibleFunc } from '../../helpers/domainGen';

export const seed = (): fc.Arbitrary<number> => fc.nat().noShrink();

export const size = (): fc.Arbitrary<number> => fc.oneof(fc.integer(0, 100), fc.constant(0), fc.constant(100));

export const counterexamplePath = (): fc.Arbitrary<string> => fc.array(fc.nat(), 1, 10).map((arr) => arr.join(':'));

export const maybe = <T>(gen: fc.Arbitrary<T>): fc.Arbitrary<T | undefined> =>
  fc.frequency({ weight: 3, arbitrary: gen }, { weight: 1, arbitrary: fc.constant(undefined) });

export const unfalsifiedPropertyResult = (): fc.Arbitrary<FilterPropertyResultByKind<'unfalsified'>> =>
  fc.tuple(fc.nat(), fc.nat(), fc.nat(), fc.nat()).map(
    ([iterations, discards, seed, size]): FilterPropertyResultByKind<'unfalsified'> => ({
      kind: 'unfalsified',
      iterations,
      discards,
      seed,
      size,
    }),
  );

const propertyFailureReason = (): fc.Arbitrary<dev.PropertyFailureReason> =>
  fc.oneof(
    fc.constant<dev.PropertyFailureReason>({ kind: 'returnedFalse' }),
    fc.anything().map<dev.PropertyFailureReason>((error) => ({ kind: 'threwError', error })),
  );

const counterexample = (): fc.Arbitrary<dev.AnyValues> => fc.array(fc.anything());

export const falsifiedPropertyResult = (): fc.Arbitrary<FilterPropertyResultByKind<'falsified'>> =>
  fc
    .tuple(
      fc.nat(),
      fc.nat(),
      fc.nat(),
      fc.nat(),
      fc.nat(),
      propertyFailureReason(),
      counterexample(),
      counterexamplePath(),
    )
    .map(
      ([
        iterations,
        discards,
        seed,
        size,
        shrinkIterations,
        reason,
        counterexample,
        counterexamplePath,
      ]): FilterPropertyResultByKind<'falsified'> => ({
        kind: 'falsified',
        iterations,
        discards,
        seed,
        size,
        shrinkIterations,
        reason,
        counterexample,
        counterexamplePath,
      }),
    );
