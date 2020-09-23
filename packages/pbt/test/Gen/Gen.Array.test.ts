import * as dev from '../../src/Gen';
import { iterateAsTrees } from './Helpers/genRunner';

type Gens_Array = 'array.unscaled' | 'array.scaleLinearly';

const genFactories: Record<Gens_Array, (min: number, max: number, elementGen: dev.Gen<number>) => dev.Gen<number[]>> = {
  'array.unscaled': dev.array.unscaled,
  'array.scaleLinearly': dev.array.scaleLinearly,
};

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
      const gen = genFactories[genLabel as Gens_Array](1, 4, dev.integer.unscaled(0, 2));

      iterateAsTrees(gen, { seed, size, iterations })
        .map((tree) => dev.Tree.format(dev.Tree.map(tree, (xs) => `[${xs.join(',')}]`)))
        .forEach((result, i) =>
          expect(result).toMatchSnapshot(`scaleMode=${genLabel} size=${size} iteration=${i + 1}`),
        );
    }
  }
});
