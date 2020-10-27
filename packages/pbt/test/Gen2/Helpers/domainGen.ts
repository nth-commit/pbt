import fc from 'fast-check';
import * as devCore from '../../../src/Core';
import * as devGenRange from '../../../src/Gen2/Range';

export const size = (): fc.Arbitrary<devCore.Size> => fc.integer(0, 100);

export const scaleMode = (): fc.Arbitrary<devGenRange.ScaleMode> => {
  const scaleModeExhaustive: { [P in devGenRange.ScaleMode]: P } = {
    constant: 'constant',
    linear: 'linear',
  };
  return fc.constantFrom(...Object.values(scaleModeExhaustive));
};

export const shuffle = <T>(arr: T[]): fc.Arbitrary<T[]> =>
  fc.array(fc.nat(), arr.length, arr.length).map((orders) =>
    arr
      .map((value, i) => ({ value: value, order: orders[i] }))
      .sort((a, b) => a.order - b.order)
      .map((x) => x.value),
  );

export const integer = fc.integer;
export const naturalNumber = fc.nat;
