import { max } from 'simple-statistics';
import * as dev from '../src';

const seed = 3633800877;
const size = 90;

const g = dev.Gen.integer()
  .between(1, 4)
  .growBy('constant')
  .flatMap((length) => dev.Gen.integer().between(0, 10).growBy('constant').array().ofLength(length));

const p = dev.property(g, (xs) => max(xs) < 10);

test('debug', () => {
  const r = dev.check(p, { seed, size, iterations: 1 });

  console.log(JSON.stringify(r, null, 2));
});
