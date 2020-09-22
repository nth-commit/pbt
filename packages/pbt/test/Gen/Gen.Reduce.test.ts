import fc from 'fast-check';
import * as devCore from '../../src/Core';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterateAsOutcomes, iterateOutcomes, iterateTrees } from './Helpers/genRunner';

test('It has an isomorphism with Array.prototype.reduce', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.firstOrderGen(),
      fc.integer(1, 10),
      domainGen.func(fc.anything(), { arity: 2 }),
      fc.anything(),
      (runParams, unreducedGen, length, f, init) => {
        const reducedGen = dev.reduce(unreducedGen, length, f, init);

        const reducedByGen = iterateAsOutcomes(reducedGen, { ...runParams, iterations: 1 })[0];

        // Seed requires an extra split, to reproduce the initial split inside of the gen's reduce
        const unreducedGenSeed = runParams.seed.split()[0];
        const reducedByArray = iterateOutcomes(unreducedGen, {
          ...runParams,
          iterations: length,
          seed: unreducedGenSeed,
        }).reduce(f, init);

        expect(reducedByGen).toEqual(reducedByArray);
      },
    ),
  );
});

test('Snapshot', () => {
  // A gen.reduce shrinks by shrinking each of the elements consumed by the original generator, and piping them
  // through the reducer function. The original elements are shrunk in isolation, from left-to-right, recursively.
  // This means we will shrink the first element to the smallest possible size which reproduces the counterexample
  // with the rest of the elements at their original size. Then, we will shrink the second. etc.

  const seed = dev.Seed.create(0);
  const iterationsBySize = new Map<number, number>([
    [0, 1],
    [20, 2],
    [50, 5],
  ]);

  const unreducedGen = dev.integer.scaleLinearly(0, 3);
  const reducedGen = dev.reduce(unreducedGen, 3, (acc, x) => [...acc, x], [] as number[]);

  for (const [size, iterations] of iterationsBySize.entries()) {
    iterateTrees(reducedGen, { seed, size, iterations })
      .map((tree) => devCore.Tree.map(tree, (xs) => `[${xs.join(',')}]`))
      .map(devCore.Tree.format)
      .forEach((result, i) => expect(result).toMatchSnapshot(`size=${size} iteration=${i + 1}`));
  }
});
