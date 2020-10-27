import fc from 'fast-check';
import * as devCore from '../../../src/Core';
import * as devGenRange from '../../../src/Gen2/Range';
import * as dev from '../srcShim';

export const seed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create).noShrink();

export const size = (): fc.Arbitrary<devCore.Size> => fc.integer(0, 100);

export const sampleFunc = <T>(): fc.Arbitrary<(gen: dev.Gen<T>) => dev.SampleResult<T>> =>
  fc.tuple(seed(), size(), integer(1, 100)).map(([seed, size, iterations]) => {
    const f = (gen: dev.Gen<T>) => dev.sample(gen, { seed, size, iterations });
    f.toString = () => `sample(gen, { seed: ${seed.valueOf()}, size: ${size}, iterations: ${iterations}})`;
    return f;
  });

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

export const zip = <Values extends any[]>(
  ...gens: { [Label in keyof Values]: fc.Arbitrary<Values[Label]> }
): fc.Arbitrary<Values> => (fc.tuple as any)(...gens);

export const setOfSize = <T>(elementGen: fc.Arbitrary<T>, size: number) => fc.set(elementGen, size, size);

export const element = <T>(arr: T[]): fc.Arbitrary<T> => fc.constantFrom(...arr);
