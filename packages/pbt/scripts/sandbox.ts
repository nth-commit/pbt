import { max } from 'simple-statistics';
import * as dev from '../src';
import { formatBreadthFirst } from './Util/GenTreeExtensions';

const seed = 3633800877;
const size = 90;

const g = dev.Gen.integer()
  .between(1, 4)
  .growBy('constant')
  // .noShrink()
  .flatMap((length) => dev.Gen.integer().between(0, 10).growBy('constant').array().ofLength(length));

const p = dev.property(g, (xs) => {
  // console.log(xs);
  // return max(xs) < 7;
  return max(xs) < 10;
});

const r = dev.check(p, { seed, size, iterations: 1 });

console.log(JSON.stringify(r, null, 2));

if (r.kind === 'falsified') {
  console.log(r.counterexample);

  const tree = dev.sampleTrees(g, { seed: r.seed, size: r.size, iterations: 1 }).values[0];
  // const tree = dev.sampleTrees(g, { seed: seed, size: size, iterations: 1 }).values[0];
  const path = r.counterexample.path.split(':').map((x) => Number(x));
  // .reverse();
  // .slice(0, 3);
  const navigatedTree = dev.GenTree.navigate(tree, [])!;
  console.log(formatBreadthFirst(navigatedTree, { formatValue: (xs) => `[${xs.join(',')}]`, maxNodes: 100 }));
  // console.log(dev.GenTree.format(navigatedTree, { formatValue: (xs) => `[${xs.join(',')}]`, maxNodes: 100 }));
}
