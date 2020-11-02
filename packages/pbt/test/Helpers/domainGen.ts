import fc from 'fast-check';
import { createHash } from 'crypto';
import { mersenne } from 'pure-rand';
import * as devCore from '../../src/Core';
import * as devGenRange from '../../src/Gen/Range';
import * as dev from '../../src';

export const integer = fc.integer;
export const naturalNumber = fc.nat;
export const decimal = fc.float;

export type FunctionConstraints = {
  arity?: number;
};

const getHexRepresentation = (x: unknown): string => {
  const json = JSON.stringify(x);
  const hash = createHash('sha256');
  hash.update(json, 'utf8');
  return hash.digest('hex');
};

export const func = <T, TArgs extends any[] = unknown[]>(
  genReturn: fc.Arbitrary<T>,
  constraints: FunctionConstraints = {},
): fc.Arbitrary<(...args: TArgs) => T> => {
  const arityFormatted = constraints.arity === undefined ? 'n' : constraints.arity;

  return fc
    .nat()
    .noBias()
    .map((n) => {
      const f = (...args: TArgs): T => {
        const hashArgs = constraints.arity === undefined ? args : args.slice(0, constraints.arity);
        const m = parseInt(getHexRepresentation(hashArgs), 16);
        const seed = n + m;
        return genReturn.generate(new fc.Random(mersenne(seed))).value;
      };

      f.toString = () => `function:${arityFormatted}`;

      return f;
    });
};

export const seed = (): fc.Arbitrary<devCore.Seed> => fc.nat().map(devCore.Seed.create).noShrink();

export const size = (): fc.Arbitrary<devCore.Size> => fc.integer(0, 100);

export const sampleConfig = (): fc.Arbitrary<dev.SampleConfig> =>
  fc.tuple(seed(), size(), integer(1, 100)).map(([seed, size, iterations]) => ({ seed, size, iterations }));

export const checkConfig = (): fc.Arbitrary<dev.CheckConfig> =>
  fc
    .tuple(seed(), size(), integer(1, 100))
    .map(([seed, size, iterations]) => ({ seed, size, iterations, path: undefined }));

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

const arrayGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown[]>> =>
  scaleMode().map((s) => augmentGenWithToString(gen.array().growBy(s), `${gen}.array().growBy(${s})`));

const mapGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> =>
  func(fc.anything()).map((f) => augmentGenWithToString(gen.map(f), `${gen}.map(f)`));

const filterGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> =>
  predicate(20).map((f) => augmentGenWithToString(gen.filter(f), `${gen}.filter(f)`));

const flatMapGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> =>
  func(firstOrderGen()).map((k) => augmentGenWithToString(gen.flatMap(k), `${gen}.flatMap(k)`));

const staticZipGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> =>
  array(firstOrderGen()).map((otherGens) =>
    augmentGenWithToString(dev.Gen.zip(gen, ...otherGens), `Gen.zip(${gen}, ...[${otherGens.length} other gen(s)])`),
  );

const staticMapGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> =>
  fc
    .tuple(array(firstOrderGen()), func(fc.anything()))
    .map(([otherGens, f]) =>
      augmentGenWithToString(
        dev.Gen.map(gen, ...otherGens, f),
        `Gen.map(${gen}, ...[${otherGens.length} other gen(s)], f)`,
      ),
    );

const higherOrderGen = (gen: dev.Gen<unknown>): fc.Arbitrary<dev.Gen<unknown>> =>
  choose(arrayGen(gen), mapGen(gen), filterGen(gen), flatMapGen(gen), staticZipGen(gen), staticMapGen(gen));

const genRec = (gen: dev.Gen<unknown>, maxRecurse: number): fc.Arbitrary<dev.Gen<unknown>> => {
  if (maxRecurse <= 0) return fc.constant(gen);
  return choose(
    fc.constant(gen),
    higherOrderGen(gen).chain((g) => genRec(g, maxRecurse - 1)),
  ).noBias();
};

export const gen = (): fc.Arbitrary<dev.Gen<unknown>> => firstOrderGen().chain((gen) => genRec(gen, 3));

export const gens = (): fc.Arbitrary<[dev.Gen<unknown>, ...dev.Gen<unknown>[]]> =>
  fc.array(gen(), { minLength: 1 }) as any;

export const predicate = (trueWeight: number = 3) =>
  func(
    fc
      .frequency({ weight: trueWeight, arbitrary: fc.constant(true) }, { weight: 1, arbitrary: fc.constant(false) })
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

export const fallibleFunc = (): fc.Arbitrary<dev.PropertyFunction<any[]>> => {
  return zip(func(integer()), passingFunc(), faillingFunc()).map(([f, passF, failF]) => (...args) => {
    const x = f(...args);
    return x % 2 === 0 ? failF() : passF();
  });
};
