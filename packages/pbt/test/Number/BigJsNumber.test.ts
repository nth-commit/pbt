import { Gen } from 'pbt';
import { BIG_JS_CALCULATOR as calculator } from '../../src/Number';

test('zero', () => {
  expect(calculator.zero.toNumber()).toEqual(0);
});

test('one', () => {
  expect(calculator.one.toNumber()).toEqual(1);
});

test('ten', () => {
  expect(calculator.ten.toNumber()).toEqual(10);
});

test.property('fromNumber', Gen.float(), (x) => {
  expect(calculator.fromNumber(x)?.toNumber()).toEqual(x);
});

test.each([NaN, Infinity])('fromNumber - errors', (x) => {
  expect(calculator.fromNumber(x)).toEqual(null);
});

test.property('add behaves like number', Gen.integer(), Gen.integer(), (x, y) => {
  const actual = calculator.toNumber(calculator.add(calculator.fromNumberUnsafe(x), calculator.fromNumberUnsafe(y)));
  const expected = x + y;
  expect(actual).toEqual(expected);
});

test.property('sub behaves like number', Gen.integer(), Gen.integer(), (x, y) => {
  const actual = calculator.toNumber(calculator.sub(calculator.fromNumberUnsafe(x), calculator.fromNumberUnsafe(y)));
  const expected = x - y;
  expect(actual).toEqual(expected);
});

test.property('lessThan behaves like number', Gen.float(), Gen.float(), (x, y) => {
  const actual = calculator.lessThan(calculator.fromNumberUnsafe(x), calculator.fromNumberUnsafe(y));
  const expected = x < y;
  expect(actual).toEqual(expected);
});

test.property('greaterThan behaves like number', Gen.float(), Gen.float(), (x, y) => {
  const actual = calculator.greaterThan(calculator.fromNumberUnsafe(x), calculator.fromNumberUnsafe(y));
  const expected = x > y;
  expect(actual).toEqual(expected);
});

test.each<[value: number, precision: number]>([
  [0, 0],
  [0.5, 1],
  [-0.5, 1],
  [0.99, 2],
  [1e-20, 20],
  [1 / 3, 16],
])('precisionOf', (value, precision) => {
  const actualPrecision = calculator.toNumber(calculator.precisionOf(calculator.fromNumberUnsafe(value)));
  expect(actualPrecision).toEqual(precision);
});

// TODO: Looks like
/*
  const floatAndPrecision: Gen<[precision: number, value: number]> = Gen.integer()
    .between(0, 4)
    .flatMap((precision) =>
      Gen.float()
        .betweenPrecision(precision, precision)
        .map((value) => [precision, value]),
    );

  test.property('precisionOf', floatAndPrecision, ([precision, value]) => {
    const actualPrecision = from(value).precisionOf().toNumber();
    expect(actualPrecision).toEqual(precision);
  });
  */

test('sign (0)', () => {
  const actualSign = calculator.sign(calculator.zero);
  expect(actualSign).toEqual(0);
});

test.property('sign (positive)', Gen.float().greaterThanEqual(1), (x) => {
  const actualSign = calculator.sign(calculator.fromNumberUnsafe(x));
  expect(actualSign).toEqual(1);
});

test.property('sign (negative)', Gen.float().lessThanEqual(-1), (x) => {
  const actualSign = calculator.sign(calculator.fromNumberUnsafe(x));
  expect(actualSign).toEqual(-1);
});
