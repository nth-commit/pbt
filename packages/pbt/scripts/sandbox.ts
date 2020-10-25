import { writeFileSync } from 'fs';
import { pipe } from 'ix/iterable';
import { take } from 'ix/iterable/operators';
import { Gen, GenIteration, Seed, Shrink } from '../src/Gen2';
import { GenTree } from '../src/GenTree';
import { explore } from '../src/Property2';
import { check } from '../src/Runners';

const id = <T>(x: T) => x;

const tree0 = GenTree.unfold(2, id, Shrink.towardsNumber(0), id);
const tree1 = GenTree.unfold(3, id, Shrink.towardsNumber(0), id);
const tree2 = GenTree.unfold(2, id, Shrink.towardsNumber(0), id);

const treeConcat = GenTree.concat([tree0, tree1, tree2], id, Shrink.array(0));

// const path = [8, 11, 9];
const path = [8, 11];
const treeConcatNavigated = GenTree.navigate(treeConcat, path);

writeFileSync('./scripts/sandbox.txt', GenTree.format(treeConcatNavigated), { encoding: 'utf-8' });

// console.log(GenTree.format(treeConcatNavigated));

const p = explore([Gen.array(Gen.array(Gen.naturalNumber()))], (xss) => {
  const set = new Set<number>();
  for (const xs of xss) {
    for (const x of xs) {
      set.add(x);
    }
  }
  return set.size < 5;
});

// console.log(
//   JSON.stringify(check(p), (key, value) => (key === 'counterexampleHistory' || key === 'path' ? undefined : value), 2),
// );

// const integer = Gen.naturalNumber(100);
// const arr = Gen.array(integer);

// const seed = Seed.create(278341638);

// for (const result of pipe(arr.run(seed.split()[1].split()[1].split()[1].split()[1], 4), take(1))) {
//   const instance = result as GenIteration.Instance<number[]>;
//   console.log(instance.tree.node);
// }

// // "seed": 278341638,
// //       "size": 4,
