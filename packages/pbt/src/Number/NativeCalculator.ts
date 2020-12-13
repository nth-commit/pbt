import { Calculator, fromPrimitives } from './Calculator';

export const NATIVE_CALCULATOR: Calculator<number> = fromPrimitives({
  add: (l, r) => l + r,
  negate: (x) => -x,
  mul: (l, r) => l * r,
  inverse: (x) => 1 / x,
  abs: (x) => Math.abs(x),
  fromNumber: (x) => x,
  compare: (l, r) => {
    if (l === r) return 0;
    if (l < r) return -1;
    return 1;
  },
  mod: (l, r) => l % r,
  pow: /*istanbul ignore next */ (l, r) => Math.pow(l, r),
  toNumber: (x) => x,
  round: (x, dp) => {
    /* istanbul ignore next */
    if (dp > 0) throw new Error('Fatal: Unsupported rounding mode on native number');
    return Math.round(x);
  },
});
