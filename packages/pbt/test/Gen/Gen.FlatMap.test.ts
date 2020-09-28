import fc from 'fast-check';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterate, iterateTrees } from './Helpers/genRunner';

test('It discards when the bound gen discards', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, baseGen) => {
      const gen = dev.flatMap(baseGen, () => dev.filter(baseGen, () => false));

      const iterations = iterate(gen, runParams);

      iterations.forEach((iteration) => {
        const expectedIterationKind: dev.GenIteration<unknown>['kind'] = 'discarded';
        expect(iteration.kind).toEqual(expectedIterationKind);
      });
    }),
  );
});

test('It exhausts when the bound gen exhausts', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.firstOrderGen(), (runParams, baseGen) => {
      const gen = dev.flatMap(baseGen, () => dev.exhausted());

      const iterations = iterate(gen, runParams);

      const expectedIteration: dev.GenIteration<unknown> = {
        kind: 'exhausted',
      };
      expect(iterations).toEqual([expectedIteration]);
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
  const flatMappedGen = dev.flatMap(unflatMappedGen, (x) => dev.map(unflatMappedGen, (y) => `[${x},${y}]`));

  for (const [size, iterations] of iterationsBySize.entries()) {
    iterateTrees(flatMappedGen, { seed, size, iterations })
      .map(dev.Tree.format)
      .forEach((result, i) => expect(result).toMatchSnapshot(`size=${size} iteration=${i + 1}`));
  }
});
