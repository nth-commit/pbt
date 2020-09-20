import fc from 'fast-check';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { castToInstance, runGen, runSucceedingGen } from './Helpers/genRunner';

type Gens_Integer = 'integer.unscaled' | 'integer.scaleLinearly';

const makeGens: Record<Gens_Integer, (min: number, max: number) => dev.Gen<number>> = {
  'integer.unscaled': dev.integer.unscaled,
  'integer.scaleLinearly': dev.integer.scaleLinearly,
};

test.each(Object.keys(makeGens))('It generates integers', (genLabel: string) => {
  const makeGen = makeGens[genLabel as Gens_Integer];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.integer(), domainGen.integer(), (runParams, a, b) => {
      const gen = makeGen(a, b);

      const xs = runSucceedingGen(gen, runParams);

      xs.forEach((x) => {
        expect(x).toEqual(Math.round(x));
      });
    }),
  );
});

test.each(Object.keys(makeGens))('It is resilient to min/max parameter ordering', (genLabel: string) => {
  const makeGen = makeGens[genLabel as Gens_Integer];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.integer(), domainGen.integer(), (runParams, a, b) => {
      const gen1 = makeGen(a, b);
      const gen2 = makeGen(b, a);

      const xs1 = runSucceedingGen(gen1, runParams);
      const xs2 = runSucceedingGen(gen2, runParams);

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

  for (const genLabel in makeGens) {
    for (const [size, iterations] of iterationsBySize.entries()) {
      const gen = makeGens[genLabel as Gens_Integer](0, 10);

      const formattedIterations = runGen(gen, { seed, size, iterations })
        .map(castToInstance)
        .map((instance) => dev.Tree.format(dev.Tree.map(instance.tree, (x) => x.toString())));

      formattedIterations.forEach((result, i) =>
        expect(result).toMatchSnapshot(`scaleMode=${genLabel} size=${size} iteration=${i + 1}`),
      );
    }
  }
});
