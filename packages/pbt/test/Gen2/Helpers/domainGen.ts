import fc from 'fast-check';
import * as devCore from '../../../src/Core';
import * as devGenRange from '../../../src/Gen2/Range';
import * as dev from '../srcShim';
import { func } from '../../helpers/domainGen';

export const seed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create).noShrink();

export const size = (): fc.Arbitrary<devCore.Size> => fc.integer(0, 100);

export const sampleConfig = (): fc.Arbitrary<dev.SampleConfig> =>
  fc.tuple(seed(), size(), integer(1, 100)).map(([seed, size, iterations]) => ({ seed, size, iterations }));

export const checkConfig = (): fc.Arbitrary<dev.CheckConfig> =>
  fc.tuple(seed(), size(), integer(1, 100)).map(([seed, size, iterations]) => ({ seed, size, iterations }));

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
export const decimal = fc.float;

export const decimalWithAtLeastOneDp = () => decimal().filter((x) => !Number.isInteger(x));

export const zip = <Values extends [any, ...any[]]>(
  ...gens: { [Label in keyof Values]: fc.Arbitrary<Values[Label]> }
): fc.Arbitrary<Values> => (fc.tuple as any)(...gens);

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

export const choose = <Values extends [any, ...any[]] | any[]>(
  ...gens: Values extends [any, ...any[]]
    ? { [Label in keyof Values]: fc.Arbitrary<Values[Label]> }
    : fc.Arbitrary<ArrayElement<Values>>[]
): fc.Arbitrary<ArrayElement<Values>> => (fc.oneof as any)(...gens);

export const setOfSize = <T>(elementGen: fc.Arbitrary<T>, size: number) => fc.set(elementGen, size, size);

export const array = fc.array;

export const element = <T>(arr: T[]): fc.Arbitrary<T> => fc.constantFrom(...arr);

const augmentGenWithToString = <T extends dev.Gen<any>>(gen: T, str: string): T => {
  gen.toString = () => str;
  return gen;
};

const firstOrderGen = (): fc.Arbitrary<dev.Gen<unknown>> =>
  element([augmentGenWithToString(dev.Gen.integer(), 'Gen.integer()')]);

const arrayGen = (elementGen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown[]>> =>
  scaleMode().map((s) => augmentGenWithToString(elementGen.array().growBy(s), `${elementGen}.array().growBy(${s})`));

const higherOrderGen = (innerGen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> => choose(arrayGen(innerGen));

const genRec = (gen: dev.Gen<unknown>, maxRecurse: number): fc.Arbitrary<dev.Gen<unknown>> => {
  if (maxRecurse <= 0) return fc.constant(gen);
  return choose(fc.constant(gen), higherOrderGen(gen));
};

export const gen = (): fc.Arbitrary<dev.Gen<unknown>> => firstOrderGen().chain((gen) => genRec(gen, 3));

export const gens = (): fc.Arbitrary<[dev.Gen<unknown>, ...dev.Gen<unknown>[]]> =>
  fc.array(gen(), { minLength: 1 }) as any;

export const predicate = () =>
  func(
    fc
      .frequency({ weight: 3, arbitrary: fc.constant(true) }, { weight: 1, arbitrary: fc.constant(false) })
      .noShrink()
      .noBias(),
  )
    .noShrink()
    .noBias();

export const faillingFunc = (): fc.Arbitrary<dev.PropertyFunction<any[]>> =>
  fc.oneof(
    fc.anything().map((x) => () => {
      throw x;
    }),
    fc.constant(() => false),
  );

export const passingFunc = (): fc.Arbitrary<dev.PropertyFunction<any[]>> =>
  fc.constantFrom(
    () => {},
    () => true,
  );
