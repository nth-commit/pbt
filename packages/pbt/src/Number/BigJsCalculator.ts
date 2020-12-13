import { Big } from 'big.js';
import { Calculator, fromPrimitives } from './Calculator';

export const BIG_JS_CALCULATOR: Calculator<Big> = fromPrimitives({
  add: (l, r) => l.add(r),
  negate: (x) => Big(0).sub(x),
  mul: (l, r) => l.mul(r),
  inverse: (x) => Big(1).div(x),
  abs: (x) => x.abs(),
  fromNumber: (x) => {
    if (Number.isNaN(x)) return null;
    if (Number.isFinite(x) === false) return null;
    return new Big(x);
  },
  compare: (l, r) => {
    if (l.eq(r)) return 0;
    if (l.lt(r)) return -1;
    return 1;
  },
  mod: (l, r) => l.mod(r),
  pow: (l, r) => l.pow(r.toNumber()),
  toNumber: (x) => x.toNumber(),
  round: (x, dp) => x.round(dp.toNumber()),
});
