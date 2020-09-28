import fc from 'fast-check';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterate, iterateAsOutcomes, iterateAsTrees } from './Helpers/genRunner';

type Gens_NaturalNumber = 'naturalNumber.unscaled' | 'naturalNumber.scaleLinearly';

const genFactories: Record<Gens_NaturalNumber, (max?: number) => dev.Gen<number>> = {
  'naturalNumber.unscaled': dev.naturalNumber.unscaled,
  'naturalNumber.scaleLinearly': dev.naturalNumber.scaleLinearly,
};

test.each(Object.keys(genFactories))('It generates integers (%s)', (genLabel: string) => {
  const genFactory = genFactories[genLabel as Gens_NaturalNumber];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.naturalNumber(), (runParams, max) => {
      const gen = genFactory(max);

      const xs = iterateAsOutcomes(gen, runParams);

      xs.forEach((x) => {
        expect(x).toEqual(Math.round(x));
      });
    }),
  );
});

test.each(Object.keys(genFactories))('When max < 0, it exhausts (%s)', (genLabel: string) => {
  const genFactory = genFactories[genLabel as Gens_NaturalNumber];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.negativeInteger(), (runParams, max) => {
      const gen = genFactory(max);

      const iterations = iterate(gen, { ...runParams });

      const expectedIteration: dev.GenIteration<unknown> = {
        kind: 'exhausted',
      };
      expect(iterations).toEqual([expectedIteration]);
    }),
  );
});

test.each(Object.keys(genFactories))('When max is not supplie, it is aiiiiight (%s)', (genLabel: string) => {
  const genFactory = genFactories[genLabel as Gens_NaturalNumber];

  fc.assert(
    fc.property(domainGen.runParams(), (runParams) => {
      const gen = genFactory();

      const iterations = iterate(gen, { ...runParams });

      for (const iteration of iterations) {
        const expectedIteration: dev.GenIteration<unknown> = {
          kind: 'instance',
          tree: expect.anything(),
        };
        expect(iteration).toEqual(expectedIteration);
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
      const gen = genFactories[genLabel as Gens_NaturalNumber](10);

      const formattedIterations = iterateAsTrees(gen, { seed, size, iterations }).map((tree) =>
        dev.Tree.format(dev.Tree.map(tree, (x) => x.toString())),
      );

      formattedIterations.forEach((result, i) =>
        expect(result).toMatchSnapshot(`scaleMode=${genLabel} size=${size} iteration=${i + 1}`),
      );
    }
  }
});
