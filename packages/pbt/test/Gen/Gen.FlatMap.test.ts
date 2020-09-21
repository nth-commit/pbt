import fc from 'fast-check';
import * as devCore from '../../src/Core';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterate, iterateTrees } from './Helpers/genRunner';

test('It discards when the bound gen discards', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, baseGen) => {
      const gen = dev.operators.flatMap(baseGen, () => dev.operators.filter(baseGen, () => false));

      const genIterations = iterate(gen, runParams);

      genIterations.forEach((genIteration) => {
        expect(genIteration.kind).toEqual('discard');
      });
    }),
  );
});

test('It exhausts when the bound gen exhausts', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, baseGen) => {
      const gen = dev.operators.flatMap(baseGen, () => dev.exhausted());

      const genIterations = iterate(gen, runParams);

      expect(genIterations).toEqual([{ kind: 'exhausted' }]);
    }),
  );
});

test('Snapshot', () => {
  // It's hard to describe the intricacies of how flatMap combines streams. It's some kind of join or summit. Check the
  // snapshots, yo!

  const seed = dev.Seed.create(0);
  const iterationsBySize = new Map<number, number>([
    [0, 1],
    [20, 2],
    [50, 5],
  ]);

  const unflatMappedGen = dev.integer.scaleLinearly(0, 5);
  const flatMappedGen = dev.operators.flatMap(unflatMappedGen, (x) =>
    dev.operators.map(unflatMappedGen, (y) => `[${x},${y}]`),
  );

  for (const [size, iterations] of iterationsBySize.entries()) {
    iterateTrees(flatMappedGen, { seed, size, iterations })
      .map(devCore.Tree.format)
      .forEach((result, i) => expect(result).toMatchSnapshot(`size=${size} iteration=${i + 1}`));
  }
});
