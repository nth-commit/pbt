import fc from 'fast-check';
import { empty } from 'ix/iterable';
import * as dev from '../../src/Gen';
import { Gens_SecondOrder } from './Gen.Spec';
import { iterate } from './Helpers/genRunner';
import * as domainGen from './Helpers/domainGen';

// Generate an array of at least one element, else the properties of second-order gen can not be observed. For example,
// it won't pipe discards/exhaustion if it doesn't try to pull from the input gen.
const arrayLengthGen = domainGen.integer(1, 10);

const gens: { [P in Gens_SecondOrder]: fc.Arbitrary<(gen: dev.Gen<unknown>) => dev.Gen<unknown>> } = {
  'array.unscaled': fc
    .tuple(arrayLengthGen, arrayLengthGen)
    .map(([min, max]) => (gen) => dev.array.unscaled(min, max, gen)),
  'array.scaleLinearly': fc
    .tuple(arrayLengthGen, arrayLengthGen)
    .map(([min, max]) => (gen) => dev.array.unscaled(min, max, gen)),
  map: domainGen.func(fc.anything()).map((f) => (gen) => dev.map(gen, f)),
  flatMap: domainGen.func(domainGen.firstOrderGen()).map((k) => (gen) => dev.flatMap(gen, k)),
  filter: domainGen.predicate().map((predicate) => (gen) => dev.filter(gen, predicate)),
  reduce: fc
    .tuple(fc.integer(1, 10), domainGen.func(fc.anything(), { arity: 2 }), fc.anything())
    .map(([length, f, init]) => (gen) => dev.reduce(gen, length, f, init)),
  noShrink: fc.constant(dev.noShrink),
  postShrink: fc.constant((gen) => dev.postShrink(gen, empty)),
};

test.each(Object.keys(gens))('It discards when the input gen discards (%s)', (genLabel: string) => {
  const genSecondOrderGen = gens[genLabel as Gens_SecondOrder];

  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gen(), genSecondOrderGen, (runParams, baseGen, secondOrderGen) => {
      const gen = secondOrderGen(dev.filter(baseGen, () => false));

      const iterations = iterate(gen, runParams);

      iterations.forEach((iteration) => {
        const expectedKind: dev.GenIteration<unknown>['kind'] = 'discarded';
        expect(iteration.kind).toEqual(expectedKind);
      });
    }),
  );
});

test.each(Object.keys(gens))('It exhausts when the input gen exhausts (%s)', (genLabel: string) => {
  const genSecondOrderGen = gens[genLabel as Gens_SecondOrder];

  fc.assert(
    fc.property(domainGen.runParams(), genSecondOrderGen, (runParams, secondOrderGen) => {
      const baseGen = dev.exhausted();
      const gen = secondOrderGen(baseGen);

      const iterations = iterate(gen, runParams);

      const expectedIteration: dev.GenIteration<unknown> = {
        kind: 'exhausted',
      };
      expect(iterations).toEqual([expectedIteration]);
    }),
  );
});
