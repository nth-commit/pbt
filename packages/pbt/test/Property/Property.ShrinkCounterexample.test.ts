import fc from 'fast-check';
import { last } from 'ix/iterable';
import * as dev from '../../src/Property';
import * as devGen from '../../src/Gen';

test('Given any two targets, and an exhaustive shrinker, it can find the combination of those targets', () => {
  fc.assert(
    fc.property(fc.integer(0, 3), fc.integer(0, 3), fc.integer(0, 3), (a, b, c) => {
      const [largest, ...targets] = [a, b, c].sort((a, b) => b - a);
      const tree: dev.Tree<number> = dev.Tree.unfold((x) => x, devGen.Shrink.towardsNumber(0), largest);

      const counterexample = last(
        dev.shrinkCounterexample<[number, number]>((x, y) => x === targets[0] && y === targets[1], [tree, tree]),
      )!;

      expect(counterexample.values).toEqual(targets);
    }),
  );
});

test.each([
  { initial: 10, target: 0, shrinker: devGen.Shrink.towardsNumber(0), expectedPath: [0] },
  { initial: 10, target: 5, shrinker: devGen.Shrink.towardsNumber(0), expectedPath: [1] },
  { initial: 10, target: 3, shrinker: devGen.Shrink.towardsNumber(0), expectedPath: [1, 2] },
])('It returns the expected path to the target counterexample', ({ initial, target, shrinker, expectedPath }) => {
  const tree: dev.Tree<number> = dev.Tree.unfold((x) => x, shrinker, initial);

  const counterexamples = Array.from(
    dev.shrinkCounterexample<[number]>((x) => x === target, [tree]),
  );
  const counterexample = last(counterexamples)!;

  expect(counterexample.values).toEqual([target]);
  expect(counterexample.path).toEqual(expectedPath);
});
