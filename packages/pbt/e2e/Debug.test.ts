import { max } from 'simple-statistics';
import * as dev from '../src';
import { formatBreadthFirst } from '../scripts/Util/GenTreeExtensions';

const seed = 3633800877;
const size = 90;

const g = dev.Gen.integer()
  .between(1, 4)
  .growBy('constant')
  .flatMap((length) => dev.Gen.integer().between(0, 10).growBy('constant').array().ofLength(length));

const p = dev.property(g, (xs) => {
  console.log(xs);
  return max(xs) < 10;
});

test.skip('debug1', () => {
  const r = dev.check(p, { seed, size, iterations: 1 });

  console.log(JSON.stringify(r, null, 2));
});

test('debug2', () => {
  const lengthG = dev.Gen.integer().between(1, 2).growBy('constant');
  const arrayG = lengthG.flatMap((length) =>
    dev.Gen.integer().between(0, 2).growBy('constant').array().ofLength(length),
  );
  const seed = 1;

  // const lengthG = dev.Gen.integer().between(1, 3).growBy('constant');
  // const arrayG = lengthG.flatMap((length) =>
  //   dev.Gen.integer().between(0, 3).growBy('constant').array().ofLength(length),
  // );
  // const seed = 5;

  // const lengthS = dev.sampleTrees(lengthG, { seed, iterations: 1 });
  // console.log(dev.GenTree.format(lengthS.values[0], { maxNodes: 10 }));

  const arrayS = dev.sampleTrees(arrayG, { seed, iterations: 1 });
  console.log(formatBreadthFirst(arrayS.values[0]));
  // console.log(dev.GenTree.format(arrayS.values[0], { maxNodes: 10 }));
});
