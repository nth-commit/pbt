import fc from 'fast-check';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';
import { failwith } from './Helpers/failwith';

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const seed = 0;
    const gen = dev.Gen.array(dev.Gen.integer().between(0, 10));

    const sampleResult = dev.sampleTrees(gen, { seed, size: i * 10, iterations: 1 });

    if (sampleResult.kind !== 'success') return failwith('Expected success');
    expect(dev.GenTree.format(sampleResult.trees[0])).toMatchSnapshot(i.toString());
  }
});

test('default(min) = 0', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, elementGen) => {
      const genDefault = dev.Gen.array(elementGen);
      const genAlt = dev.Gen.array(elementGen).ofMinLength(0);

      expect(dev.sample(genDefault, config)).toEqual(dev.sample(genAlt, config));
    }),
  );
});

test('default(max) = 25', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, elementGen) => {
      const genDefault = dev.Gen.array(elementGen);
      const genAlt = dev.Gen.array(elementGen).ofMaxLength(25);

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

test('Gen.array().ofMaxLength(x).growBy(s) *produces* arrays with length equal to *oracle* Gen.integer().between(0, x).growBy(s)', () => {
  fc.assert(
    fc.property(
      domainGen.sampleConfig(),
      domainGen.gen(),
      domainGen.integer({ min: 0, max: 25 }),
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
