import { Gen } from 'pbt';
import * as dev from '../../src';
import { expectGen } from '../Helpers/expectGen';

describe('Gen.zip', () => {
  test('nullary invocation', () => {
    const gen = dev.Gen.zip();

    expectGen(gen).toEqualConstant([]);
  });

  test.property('unary invocation', Gen.two(Gen.integer()), ([a, b]) => {
    const gen = dev.Gen.integer().between(a, b);

    expectGen(dev.Gen.zip(gen)).toEqual(gen.map((x) => [x]));
  });

  test.property('binary invocation', Gen.four(Gen.integer()), ([a, b, c, d]) => {
    const gen0 = dev.Gen.integer().between(a, b);
    const gen1 = dev.Gen.integer().between(c, d);

    expectGen(dev.Gen.zip(gen0, gen1)).toEqual(gen0.flatMap((x) => gen1.map((y) => [x, y])));
  });
});

test.property('Gen.two(g) = Gen.zip(g, g)', Gen.two(Gen.integer()), ([a, b]) => {
  const gen = dev.Gen.integer().between(a, b);

  expectGen(dev.Gen.two(gen)).toEqual(dev.Gen.zip(gen, gen));
});

test.property('Gen.three(g) = Gen.zip(g, g, g)', Gen.two(Gen.integer()), ([a, b]) => {
  const gen = dev.Gen.integer().between(a, b);

  expectGen(dev.Gen.three(gen)).toEqual(dev.Gen.zip(gen, gen, gen));
});

test.property('Gen.four(g) = Gen.zip(g, g, g, g)', Gen.two(Gen.integer()), ([a, b]) => {
  const gen = dev.Gen.integer().between(a, b);

  expectGen(dev.Gen.four(gen)).toEqual(dev.Gen.zip(gen, gen, gen, gen));
});

describe('Gen.map', () => {
  const toTuple = <Ts extends any[]>(...xs: Ts): Ts => xs;

  test('nullary invocation', () => {
    expectGen(dev.Gen.map(toTuple)).toEqualConstant([]);
  });

  test.property('unary invocation', Gen.two(Gen.integer()), ([a, b]) => {
    const gen = dev.Gen.integer().between(a, b);

    expectGen(dev.Gen.map(gen, toTuple)).toEqual(dev.Gen.zip(gen));
  });

  test.property('binary invocation', Gen.four(Gen.integer()), ([a, b, c, d]) => {
    const gen0 = dev.Gen.integer().between(a, b);
    const gen1 = dev.Gen.integer().between(c, d);

    expectGen(dev.Gen.map(gen0, gen1, toTuple)).toEqual(dev.Gen.zip(gen0, gen1));
  });
});

describe('Gen.flatMap', () => {
  const toGenOfTuple = <Ts extends any[]>(...xs: Ts): dev.Gen<Ts> => dev.Gen.constant(xs);

  test('nullary invocation', () => {
    expectGen(dev.Gen.flatMap(toGenOfTuple)).toEqualConstant([]);
  });

  test.property('unary invocation', Gen.two(Gen.integer()), ([a, b]) => {
    const gen = dev.Gen.integer().between(a, b);

    expectGen(dev.Gen.flatMap(gen, toGenOfTuple)).toEqual(dev.Gen.zip(gen));
  });

  test.property('binary invocation', Gen.four(Gen.integer()), ([a, b, c, d]) => {
    const gen0 = dev.Gen.integer().between(a, b);
    const gen1 = dev.Gen.integer().between(c, d);

    expectGen(dev.Gen.flatMap(gen0, gen1, toGenOfTuple)).toEqual(dev.Gen.zip(gen0, gen1));
  });
});
