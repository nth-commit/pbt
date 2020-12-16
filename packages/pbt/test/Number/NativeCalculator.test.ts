import { Gen } from 'pbt';
import { nativeCalculator as calculator } from '../../src/Number';
import { DomainGenV2 } from '../Helpers/domainGenV2';

test('zero', () => {
  expect(calculator.zero).toEqual(0);
});

test('one', () => {
  expect(calculator.one).toEqual(1);
});

test('ten', () => {
  expect(calculator.ten).toEqual(10);
});

describe('load', () => {
  test('load(NaN), returns error', () => {
    const actual = calculator.load(NaN).flatten();

    expect(actual).toEqual('parsedNaN');
  });

  test('load(Infinity), returns error', () => {
    const actual = calculator.load(Infinity).flatten();

    expect(actual).toEqual('parsedInfinity');
  });

  test('load(-Infinity), returns error', () => {
    const actual = calculator.load(-Infinity).flatten();

    expect(actual).toEqual('parsedInfinity');
  });

  test.property('load(x), x ∉ R, returns success', Gen.float(), (x) => {
    const actual = calculator.load(x).flatten();

    expect(actual).toEqual(x);
  });
});

describe('loadUnsafe', () => {
  test.property('it accepts literally any runtime value', DomainGenV2.anything(), (x) => {
    const actual = calculator.loadUnchecked(x as number);

    expect(actual).toEqual(x);
  });
});

describe('loadInteger', () => {
  test('loadInteger(NaN), returns error', () => {
    const actual = calculator.loadInteger(NaN).flatten();

    expect(actual).toEqual('parsedNaN');
  });

  test('loadInteger(Infinity), returns error', () => {
    const actual = calculator.loadInteger(Infinity).flatten();

    expect(actual).toEqual('parsedInfinity');
  });

  test('loadInteger(-Infinity), returns error', () => {
    const actual = calculator.loadInteger(-Infinity).flatten();

    expect(actual).toEqual('parsedInfinity');
  });

  test.property('loadInteger(x), x ∉ I, returns error', Gen.float().ofMinPrecision(1), (x) => {
    const actual = calculator.loadInteger(x).flatten();

    expect(actual).toEqual('parsedDecimal');
  });

  test.property('loadInteger(x), x ∈ I, returns success', Gen.integer(), (x) => {
    const actual = calculator.loadInteger(x).flatten();

    expect(actual).toEqual(x);
  });
});

describe('loadIntegerUnsafe', () => {
  test.property('it accepts literally any runtime value', DomainGenV2.anything(), (x) => {
    const actual = calculator.loadIntegerUnchecked(x as number);

    expect(actual).toEqual(x);
  });
});

describe('unload', () => {
  test.property('unload(loadUnsafe(x)) = x', Gen.float(), (x) => {
    expect(calculator.unload(calculator.loadUnchecked(x))).toEqual(x);
  });
});

describe('unloadInteger', () => {
  test.property('unloadInteger(loadIntegerUnsafe(x)) = x', Gen.integer(), (x) => {
    expect(calculator.unloadInteger(calculator.loadIntegerUnchecked(x))).toEqual(x);
  });
});

describe('add', () => {
  test.property('it behaves like + operator', Gen.float(), Gen.float(), (x, y) => {
    const actual = calculator.unload(calculator.add(calculator.loadUnchecked(x), calculator.loadUnchecked(y)));

    expect(x + y).toEqual(actual);
  });
});

describe('sub', () => {
  test.property('it behaves like - operator', Gen.float(), Gen.float(), (x, y) => {
    const actual = calculator.unload(calculator.sub(calculator.loadUnchecked(x), calculator.loadUnchecked(y)));

    expect(x - y).toEqual(actual);
  });
});

describe('mul', () => {
  test.property('it behaves like * operator', Gen.float(), Gen.float(), (x, y) => {
    const actual = calculator.unload(calculator.mul(calculator.loadUnchecked(x), calculator.loadUnchecked(y)));

    expect(x * y).toEqual(actual);
  });
});

describe('div', () => {
  test.property('it behaves like / operator', Gen.float(), Gen.float(), (x, y) => {
    const actual = calculator.unload(calculator.div(calculator.loadUnchecked(x), calculator.loadUnchecked(y)));

    expect(x / y).toEqual(actual);
  });
});

describe('mod', () => {
  test.property('it behaves like % operator', Gen.float(), Gen.float(), (x, y) => {
    const actual = calculator.unload(calculator.mod(calculator.loadUnchecked(x), calculator.loadUnchecked(y)));

    expect(x % y).toEqual(actual);
  });
});

describe('compare', () => {
  const sort = <T>(xs: T[], comparer: (a: T, b: T) => number): T[] => [...xs].sort(comparer);

  test.property('when sorting by compare, it behaves like sorting by (a - b)', Gen.float().array(), (unloaded) => {
    const loaded = unloaded.map(calculator.loadUnchecked);

    expect(sort(unloaded, (a, b) => a - b)).toEqual(sort(loaded, calculator.compare).map(calculator.unload));
  });
});

describe('equals', () => {
  test.property('equals(x, x), returns true', Gen.float().map(calculator.loadUnchecked), (x) => {
    expect(calculator.equals(x, x)).toBeTrue();
  });

  test.property('equals behaves like === operator', Gen.float(), Gen.float(), (x, y) => {
    expect(calculator.equals(calculator.loadUnchecked(x), calculator.loadUnchecked(y))).toEqual(x === y);
  });
});

describe('lessThan', () => {
  test.property('lessThan(x, x), returns false', Gen.float().map(calculator.loadUnchecked), (x) => {
    expect(calculator.lessThan(x, x)).toBeFalse();
  });

  test.property('lessThan behaves like < operator', Gen.float(), Gen.float(), (x, y) => {
    expect(calculator.lessThan(calculator.loadUnchecked(x), calculator.loadUnchecked(y))).toEqual(x < y);
  });
});

describe('lessThanEquals', () => {
  test.property('lessThanEquals(x, x), returns false', Gen.float().map(calculator.loadUnchecked), (x) => {
    expect(calculator.lessThanEquals(x, x)).toBeTrue();
  });

  test.property('lessThanEquals behaves like <= operator', Gen.float(), Gen.float(), (x, y) => {
    expect(calculator.lessThanEquals(calculator.loadUnchecked(x), calculator.loadUnchecked(y))).toEqual(x <= y);
  });
});

describe('greaterThan', () => {
  test.property('greaterThan(x, x), returns false', Gen.float().map(calculator.loadUnchecked), (x) => {
    expect(calculator.greaterThan(x, x)).toBeFalse();
  });

  test.property('greaterThan behaves like > operator', Gen.float(), Gen.float(), (x, y) => {
    expect(calculator.greaterThan(calculator.loadUnchecked(x), calculator.loadUnchecked(y))).toEqual(x > y);
  });
});

describe('greaterThanEquals', () => {
  test.property('greaterThanEquals(x, x), returns false', Gen.float().map(calculator.loadUnchecked), (x) => {
    expect(calculator.greaterThanEquals(x, x)).toBeTrue();
  });

  test.property('greaterThanEquals behaves like >= operator', Gen.float(), Gen.float(), (x, y) => {
    expect(calculator.greaterThanEquals(calculator.loadUnchecked(x), calculator.loadUnchecked(y))).toEqual(x >= y);
  });
});

describe('signOf', () => {
  test('signOf(0) = 0', () => {
    expect(calculator.signOf(calculator.loadUnchecked(0))).toEqual(0);
  });

  test.property('signOf(x), x > 0, returns 1', Gen.float().greaterThanEqual(1), (x) => {
    expect(calculator.signOf(calculator.loadUnchecked(x))).toEqual(1);
  });

  test.property('signOf(x), x < 0, returns -1', Gen.float().lessThanEqual(-1), (x) => {
    expect(calculator.signOf(calculator.loadUnchecked(x))).toEqual(-1);
  });
});

describe('negationOf', () => {
  test('negationOf(0) returns 0', () => {
    expect(calculator.unload(calculator.negationOf(calculator.loadUnchecked(0)))).toEqual(0);
  });

  test.property(
    'negationOf(x) returns -x',
    Gen.float().filter((x) => x !== 0),
    (x) => {
      expect(calculator.unload(calculator.negationOf(calculator.loadUnchecked(x)))).toEqual(-x);
    },
  );
});

describe('absoluteOf', () => {
  test.property('it behaves like Math.abs', Gen.float(), (x) => {
    expect(calculator.unload(calculator.absoluteOf(calculator.loadUnchecked(x)))).toEqual(Math.abs(x));
  });
});

describe('precisionOf', () => {
  test.each<[x: number, precision: number]>([
    [0, 0],
    [0.5, 1],
    [-0.5, 1],
    [0.99, 2],
  ])('precisionOf', (x, precision) => {
    expect(calculator.unloadInteger(calculator.precisionOf(calculator.loadUnchecked(x)))).toEqual(precision);
  });
});
