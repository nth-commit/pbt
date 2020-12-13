export type CalculatorPrimitives<TNumber> = {
  fromNumber(x: number): TNumber | null;
  toNumber(x: TNumber): number;
  add(l: TNumber, r: TNumber): TNumber;
  mul(l: TNumber, r: TNumber): TNumber;
  negate(x: TNumber): TNumber;
  inverse(x: TNumber): TNumber;
  pow(l: TNumber, r: TNumber): TNumber;
  mod(l: TNumber, r: TNumber): TNumber;
  abs(l: TNumber): TNumber;
  compare(l: TNumber, r: TNumber): -1 | 0 | 1;
  round(x: TNumber, dp: TNumber): TNumber;
};

export type CalculatorDerivatives<TNumber> = {
  readonly zero: TNumber;
  readonly one: TNumber;
  readonly ten: TNumber;
  fromNumberUnsafe(x: number): TNumber;
  sub(l: TNumber, r: TNumber): TNumber;
  div(l: TNumber, r: TNumber): TNumber;
  equals(a: TNumber, b: TNumber): boolean;
  lessThan(a: TNumber, b: TNumber): boolean;
  greaterThan(a: TNumber, b: TNumber): boolean;
  lessThanEquals(a: TNumber, b: TNumber): boolean;
  greaterThanEquals(a: TNumber, b: TNumber): boolean;
  precisionOf(x: TNumber): TNumber;
  sign(x: TNumber): -1 | 0 | 1;
};

export type Calculator<TNumber> = CalculatorPrimitives<TNumber> & CalculatorDerivatives<TNumber>;

const makeFromNumberUnsafe = <TNumber>(
  calculator: Pick<Calculator<TNumber>, 'fromNumber'>,
): Pick<Calculator<TNumber>, 'fromNumberUnsafe'> => ({
  fromNumberUnsafe: (x) => {
    const result = calculator.fromNumber(x);

    /* istanbul ignore next */
    if (result === null) {
      throw new Error(`Failed to parse number: ${x}`);
    }

    return result;
  },
});

const makeBuiltInConstants = <TNumber>(
  calculator: Pick<Calculator<TNumber>, 'fromNumberUnsafe'>,
): Pick<Calculator<TNumber>, 'zero' | 'one' | 'ten'> => ({
  zero: calculator.fromNumberUnsafe(0),
  one: calculator.fromNumberUnsafe(1),
  ten: calculator.fromNumberUnsafe(10),
});

const makeInverseOperations = <TNumber>(
  calculator: Pick<Calculator<TNumber>, 'add' | 'negate' | 'mul' | 'inverse'>,
): Pick<Calculator<TNumber>, 'sub' | 'div'> => ({
  sub: (l, r) => calculator.add(l, calculator.negate(r)),
  div: (l, r) => calculator.mul(l, calculator.inverse(r)),
});

const makeBooleanComparators = <TNumber>(
  calculator: Pick<Calculator<TNumber>, 'compare'>,
): Pick<Calculator<TNumber>, 'equals' | 'lessThan' | 'greaterThan' | 'lessThanEquals' | 'greaterThanEquals'> => ({
  equals: (l, r) => calculator.compare(l, r) === 0,
  lessThan: (l, r) => calculator.compare(l, r) === -1,
  greaterThan: (l, r) => calculator.compare(l, r) === 1,
  lessThanEquals: (l, r) => {
    const comparer = calculator.compare(l, r);
    return comparer === 0 || comparer === -1;
  },
  greaterThanEquals: (l, r) => {
    const comparer = calculator.compare(l, r);
    return comparer === 0 || comparer === 1;
  },
});

const makePrecisionOf = <TNumber>(
  calculator: Pick<
    Calculator<TNumber>,
    'fromNumberUnsafe' | 'mul' | 'abs' | 'mod' | 'zero' | 'one' | 'ten' | 'greaterThan'
  >,
): Pick<Calculator<TNumber>, 'precisionOf'> => ({
  precisionOf: (x) => {
    let iteration = calculator.abs(x);
    let count = 0;

    while (calculator.greaterThan(calculator.mod(iteration, calculator.one), calculator.zero)) {
      count++;
      iteration = calculator.mul(iteration, calculator.ten);
    }

    return calculator.fromNumberUnsafe(count);
  },
});

const makeSign = <TNumber>(
  calculator: Pick<Calculator<TNumber>, 'compare' | 'zero'>,
): Pick<Calculator<TNumber>, 'sign'> => ({
  sign: (x) => calculator.compare(x, calculator.zero),
});

export const fromPrimitives = <TNumber>(calculatorPrimitives: CalculatorPrimitives<TNumber>): Calculator<TNumber> => {
  const withFromNumberUnsafe = {
    ...calculatorPrimitives,
    ...makeFromNumberUnsafe(calculatorPrimitives),
  };

  const withBuiltInConstants = {
    ...withFromNumberUnsafe,
    ...makeBuiltInConstants(withFromNumberUnsafe),
  };

  const withInverseOperations = {
    ...withBuiltInConstants,
    ...makeInverseOperations(withBuiltInConstants),
  };

  const withBooleanComparators = {
    ...withInverseOperations,
    ...makeBooleanComparators(withInverseOperations),
  };

  const withPrecisionOf = {
    ...withBooleanComparators,
    ...makePrecisionOf(withBooleanComparators),
  };

  const withSign = {
    ...withPrecisionOf,
    ...makeSign(withPrecisionOf),
  };

  return withSign;
};
