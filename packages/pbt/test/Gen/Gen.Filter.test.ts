import fc from 'fast-check';
import * as dev from '../../src';
import * as domainGen from '../Helpers/domainGen';

test('snapshot', () => {
  for (let i = 0; i <= 10; i++) {
    const seed = 0;
    const gen = dev.Gen.integer()
      .between(0, 10)
      .filter((x) => x % 2 === 0);

    const sample = dev.sampleTrees(gen, { seed, size: i * 10, iterations: 1 });

    expect(dev.GenTree.format(sample.values[0])).toMatchSnapshot(i.toString());
  }
});

test('sample(gen.filter(false)) *throws* exhausted', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, gen) => {
      const genFiltered = gen.filter(() => false);

      expect(() => dev.sample(genFiltered, config)).toThrow('Exhausted after');
    }),
  );
});

test('sample(gen.filter(size > 50)) *produces* values *because* it resizes itself after a failed predicate', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), (config) => {
      const gen = dev.Gen.create(
        (_, size) => size,
        dev.Shrink.none(),
        (size) => size,
      );
      const genFiltered = gen.filter((size) => size > 50);

      expect(() => dev.sample(genFiltered, config)).not.toThrow();
    }),
  );
});

test('sample(gen.map(f)) *produces* values, x, where f(x) = true', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), domainGen.predicate(), (config, gen, f) => {
      const genFiltered = gen.filter(f);

      const sample = dev.sampleTrees(genFiltered, config);

      for (const tree of sample.values) {
        expect(f(tree.node.value)).toEqual(true);
        for (const shrink of dev.GenTree.traverseGreedy(tree)) {
          expect(f(shrink.value)).toEqual(true);
        }
      }
    }),
  );
});
