import fc from 'fast-check';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const seed = 0;
    const gen = dev.Gen.integer()
      .between(0, 10)
      .map((x) => String.fromCharCode(x + 65));

    const sample = dev.sampleTrees(gen, { seed, size: i * 10, iterations: 1 });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot(i.toString());
  }
});

test('sample(gen.map(f)).values = sample(gen).values.map(f)', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), fc.func(fc.anything()), (config, gen, f) => {
      const genMapped = gen.map((x) => f(x));

      const mappedSample = dev.sampleTrees(genMapped, config);
      const unmappedSample = dev.sampleTrees(gen, config);

      const actualTrees = mappedSample.values.map(dev.GenTree.traverseGreedy);
      const expectedTrees = unmappedSample.values
        .map((tree) => dev.GenTree.map(tree, f))
        .map(dev.GenTree.traverseGreedy);
      expect(actualTrees).toEqual(expectedTrees);
    }),
  );
});

describe('equivalent APIs', () => {
  test('gen.map(f) = Gen.map(gen, f)', () => {
    fc.assert(
      fc.property(domainGen.sampleConfig(), domainGen.gen(), fc.func(fc.anything()), (config, gen, f) => {
        const genMapped = gen.map((x) => f(x));
        const genMappedAlt = dev.Gen.map(gen, (x) => f(x));

        expect(dev.sample(genMapped, config)).toEqual(dev.sample(genMappedAlt, config));
      }),
    );
  });
});
