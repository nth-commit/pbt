import { Big } from 'big.js';
import { Calculator, CalculatorEngine, Sign } from './Calculator';

class BigJsCalculatorEngine implements CalculatorEngine<Big> {
  load(x: number | Big): Big {
    return Big(x);
  }

  unload(x: Big): number {
    return x.toNumber();
  }

  add(l: Big, r: Big): Big {
    return l.add(r);
  }

  sub(l: Big, r: Big): Big {
    return l.minus(r);
  }

  mul(l: Big, r: Big): Big {
    return l.mul(r);
  }

  div(l: Big, r: Big): Big {
    return l.div(r);
  }

  mod(x: Big, q: Big): Big {
    return x.mod(q);
  }

  pow(x: Big, e: Big): Big {
    return x.pow(e.toNumber());
  }

  round(x: Big, p: Big): Big {
    return x.round(p.toNumber());
  }

  compare(l: Big, r: Big): Sign {
    if (l.gt(r)) return 1;
    if (l.eq(r)) return 0;
    return -1;
  }
}

export const bigJsCalculator = Calculator.create(new BigJsCalculatorEngine());
