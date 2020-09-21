import fc from 'fast-check';
import * as devCore from '../../src/Core';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterateAsOutcomes, iterateAsTrees } from './Helpers/genRunner';

type Gens_Integer = 'integer.unscaled' | 'integer.scaleLinearly';

const genFactories: Record<Gens_Integer, (min: number, max: number) => dev.Gen<number>> = {
  'integer.unscaled': dev.integer.unscaled,
  'integer.scaleLinearly': dev.integer.scaleLinearly,
};

test.each(Object.keys(genFactories))('It generates integers (%s)', (genLabel: string) => {
  const genFactory = genFactories[genLabel as Gens_Integer];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.integer(), domainGen.integer(), (runParams, a, b) => {
      const gen = genFactory(a, b);

      const xs = iterateAsOutcomes(gen, runParams);

      xs.forEach((x) => {
        expect(x).toEqual(Math.round(x));
      });
    }),
  );
});

test.each(Object.keys(genFactories))('It is resilient to min/max parameter ordering (%s)', (genLabel: string) => {
  const genFactory = genFactories[genLabel as Gens_Integer];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.integer(), domainGen.integer(), (runParams, a, b) => {
      const gen1 = genFactory(a, b);
      const gen2 = genFactory(b, a);

      const xs1 = iterateAsOutcomes(gen1, runParams);
      const xs2 = iterateAsOutcomes(gen2, runParams);

      for (let i = 0; i < xs1.length; i++) {
        expect(xs1[i]).toEqual(xs2[i]);
      }
    }),
  );
});

test('Regression tests', () => {
  const seed = dev.Seed.create(0);
  const iterationsBySize = new Map<number, number>([
    [0, 1],
    [20, 2],
    [50, 5],
    [100, 2],
  ]);

  for (const genLabel in genFactories) {
    for (const [size, iterations] of iterationsBySize.entries()) {
      const gen = genFactories[genLabel as Gens_Integer](0, 10);

      const formattedIterations = iterateAsTrees(gen, { seed, size, iterations }).map((tree) =>
        devCore.Tree.format(devCore.Tree.map(tree, (x) => x.toString())),
      );

      formattedIterations.forEach((result, i) =>
        expect(result).toMatchSnapshot(`scaleMode=${genLabel} size=${size} iteration=${i + 1}`),
      );
    }
  }
});
