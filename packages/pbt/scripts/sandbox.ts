import fc from 'fast-check';
import { Gen } from '../src/Gen';
import { GenTree } from '../src/GenTree';
import { sample, sampleTrees } from '../src/Runners';
import { gen } from '../test/Helpers/domainGen';

console.log(
  fc.sample(
    gen().map((g) => g.toString()),
    { numRuns: 10 },
  ),
);

// const result = sampleTrees(Gen.integer().between(-100, -1), { iterations: 1, size: 100, seed: 0 });
// if (result.kind === 'error') throw 'uh oh';

// console.log(GenTree.format(result.trees[0], { indentation: '.' }));
