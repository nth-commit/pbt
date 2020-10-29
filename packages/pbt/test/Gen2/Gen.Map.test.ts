import fc from 'fast-check';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';

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
