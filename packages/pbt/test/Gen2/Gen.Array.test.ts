import fc from 'fast-check';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';
import { failwith } from './Helpers/failwith';

const genArrayLength = () => domainGen.integer({ min: 0, max: 10 });

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const seed = 0;
    const gen = dev.Gen.array(dev.Gen.integer().between(0, 10));

    const sample = dev.sampleTrees(gen, { seed, size: i * 10, iterations: 1 });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot(i.toString());
  }
});

test('Gen.array(gen).ofMaxLength(x).growBy(s) *produces* arrays with length equal to *oracle* Gen.integer().between(0, x).growBy(s)', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.gen(),
      genArrayLength(),
      domainGen.scaleMode(),
      (config, elementGen, x, s) => {
        const genArray = dev.Gen.array(elementGen)
          .ofMaxLength(x)
          .growBy(s)
          .map((arr) => arr.length);
        const genInteger = dev.Gen.integer().between(0, x).growBy(s);

        expect(dev.sample(genArray, config)).toEqual(dev.sample(genInteger, config));
      },
    ),
  );
});

describe('defaults', () => {
  test('default(min) = 0', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, elementGen) => {
        const genDefault = dev.Gen.array(elementGen);
        const genAlt = dev.Gen.array(elementGen).ofMinLength(0);

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genAlt, config));
      }),
    );
  });

  test('default(max) = 10', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, elementGen) => {
        const genDefault = dev.Gen.array(elementGen);
        const genAlt = dev.Gen.array(elementGen).ofMaxLength(10);

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genAlt, config));
      }),
    );
  });

  test('default(scale) = linear', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, elementGen) => {
        const genDefault = dev.Gen.array(elementGen);
        const genAlt = dev.Gen.array(elementGen).growBy('linear');

        expect(dev.sample(genDefault, config)).toEqual(dev.sample(genAlt, config));
      }),
    );
  });
});

describe('equivalent APIs', () => {
  test('Gen.array(gen) = gen.array()', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, elementGen) => {
        const genArray = dev.Gen.array(elementGen);
        const genArrayAlt = elementGen.array();

        expect(dev.sample(genArray, config)).toEqual(dev.sample(genArrayAlt, config));
      }),
    );
  });

  test('Gen.array(gen).betweenLengths(x, y) = Gen.array(gen).betweenLengths(y, x)', () => {
    fc.assert(
      fc.property(
        domainGen.sampleConfig(),
        domainGen.gen(),
        genArrayLength(),
        genArrayLength(),
        (config, elementGen, x, y) => {
          const genArray = dev.Gen.array(elementGen).betweenLengths(x, y);
          const genArrayAlt = dev.Gen.array(elementGen).betweenLengths(y, x);

          expect(dev.sample(genArray, config)).toEqual(dev.sample(genArrayAlt, config));
        },
      ),
      { seed: -617649306, path: '0:0:0:0:1:0:0:0', endOnFailure: true },
    );
  });

  test('Gen.array(gen).ofMinLength(x).ofMaxLength(y) = Gen.array(gen).betweenLengths(x, y)', () => {
    fc.assert(
      fc.property(
        domainGen.sampleConfig(),
        domainGen.gen(),
        genArrayLength(),
        genArrayLength(),
        (config, elementGen, x, y) => {
          const genArray = dev.Gen.array(elementGen).ofMinLength(x).ofMaxLength(y);
          const genArrayAlt = dev.Gen.array(elementGen).betweenLengths(x, y);

          expect(dev.sample(genArray, config)).toEqual(dev.sample(genArrayAlt, config));
        },
      ),
    );
  });

  test('Gen.array(gen).ofLength(x) = Gen.array(gen).betweenLengths(x, x)', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), genArrayLength(), (config, elementGen, x) => {
        const genArray = dev.Gen.array(elementGen).ofLength(x);
        const genArrayAlt = dev.Gen.array(elementGen).betweenLengths(x, x);

        expect(dev.sample(genArray, config)).toEqual(dev.sample(genArrayAlt, config));
      }),
    );
  });
});

describe('errors', () => {
  test('Gen.array(gen).ofMinLength(x), x ∉ ℤ *produces* error; minimum must be an integer', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), domainGen.decimalWithAtLeastOneDp(), (config, gen, x) => {
        const genArray = dev.Gen.array(gen).ofMinLength(x);

        expect(() => dev.sample(genArray, config)).toThrowError('Minimum must be an integer');
      }),
    );
  });

  test('Gen.array(gen).ofMaxLength(x), x ∉ ℤ *produces* error; maximum must be an integer', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), domainGen.decimalWithAtLeastOneDp(), (config, gen, x) => {
        const genArray = dev.Gen.array(gen).ofMaxLength(x);

        expect(() => dev.sample(genArray, config)).toThrow('Maximum must be an integer');
      }),
    );
  });

  test('Gen.array(gen).ofMinLength(x), x < 0 *produces* error; minimum must be at least 0', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), domainGen.integer({ max: -1 }), (config, gen, x) => {
        const genArray = dev.Gen.array(gen).ofMinLength(x);

        expect(() => dev.sample(genArray, config)).toThrow('Minimum must be at least 0');
      }),
    );
  });

  test('Gen.array(gen).ofMaxLength(x), x < 0 *produces* error; maximum must be at least 0', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), domainGen.integer({ max: -1 }), (config, gen, x) => {
        const genArray = dev.Gen.array(gen).ofMaxLength(x);

        expect(() => dev.sample(genArray, config)).toThrow('Maximum must be at least 0');
      }),
    );
  });
});

describe('shrinks', () => {
  test('Gen.array(gen).ofMinLength(x) *produces* arrays that shrink to length = x', () => {
    fc.assert(
      fc.property(
        domainGen.checkConfig(),
        domainGen.gen(),
        genArrayLength(),
        domainGen.faillingFunc(),
        (config, gen, x, f) => {
          const genArray = dev.Gen.array(gen).ofMinLength(x);

          const checkResult = dev.check(dev.property(genArray, f), config);

          if (checkResult.kind !== 'falsified') return failwith('expected falsified');
          expect(checkResult.counterexample.value[0].length).toEqual(x);
          expect(checkResult.counterexample.complexity).toEqual(0);
        },
      ),
    );
  });
});
