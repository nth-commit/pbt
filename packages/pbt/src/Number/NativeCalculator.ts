import { Result } from '../Core';
import { Calculator, CalculatorEngine, LoadNumberErrorCode, Sign } from './Calculator';

class NativeCalculatorEngine implements CalculatorEngine<number> {
  load(x: number): number {
    return x;
  }

  unload(x: number): number {
    return x;
  }

  add(l: number, r: number): number {
    return l + r;
  }

  sub(l: number, r: number): number {
    return l - r;
  }

  mul(l: number, r: number): number {
    return l * r;
  }

  div(l: number, r: number): number {
    return l / r;
  }

  mod(x: number, q: number): number {
    return x % q;
  }

  /* istanbul ignore next */
  pow(x: number, e: number): number {
    return Math.pow(x, e);
  }

  /* istanbul ignore next */
  round(x: number, p: number): number {
    if (p > 0) throw new Error('Fatal: Rounding to non-zero precision not supported by native number');
    return Math.round(x);
  }

  compare(l: number, r: number): Sign {
    if (l > r) return 1;
    if (l === r) return 0;
    return -1;
  }
}

export const nativeCalculator = Calculator.create(new NativeCalculatorEngine());
