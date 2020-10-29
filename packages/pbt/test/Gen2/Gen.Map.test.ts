import fc from 'fast-check';
import * as dev from './srcShim';
import * as domainGen from './Helpers/domainGen';
import { failwith } from './Helpers/failwith';

test('sample(gen.map(f)).values = sample(gen).values.map(f)', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), fc.func(fc.anything()), (config, gen, f) => {
      const genMapped = gen.map((x) => f(x));

      const mappedSampleResult = dev.sampleTrees(genMapped, config);
      const unmappedSampleResult = dev.sampleTrees(gen, config);
      if (mappedSampleResult.kind === 'error' || unmappedSampleResult.kind === 'error')
        return failwith('Expected success');

      const actualTrees = mappedSampleResult.values.map(dev.GenTree.traverseGreedy);
      const expectedTrees = unmappedSampleResult.values
        .map((tree) => dev.GenTree.map(tree, f))
        .map(dev.GenTree.traverseGreedy);
      expect(actualTrees).toEqual(expectedTrees);
    }),
  );
});
