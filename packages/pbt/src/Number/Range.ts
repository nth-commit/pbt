import { Calculator, Integer, Real } from './Calculator';

export type ScaleMode = 'constant' | 'linear';

export type Bounds<TNumber> = [min: Integer<TNumber>, max: Integer<TNumber>];

export type Range<TNumber> = {
  getSizedBounds: (size: Integer<TNumber>) => Bounds<TNumber>;
  getProportionalDistance: (n: Real<TNumber>) => Real<TNumber>;
  origin: Integer<TNumber>;
  bounds: Bounds<TNumber>;
};

export namespace Range {
  type RangeConstants<TNumber> = {
    oneHundred: Integer<TNumber>;
  };

  const labelParams = <TNumber>(
    calculator: Calculator<TNumber>,
    x: Integer<TNumber>,
    y: Integer<TNumber>,
    z: Integer<TNumber>,
  ): { min: Integer<TNumber>; max: Integer<TNumber>; origin: Integer<TNumber> } => {
    const [min, origin, max] = [x, y, z].sort(calculator.compare);
    return { min, max, origin };
  };

  const scaleLinear = <TNumber>(
    calculator: Calculator<TNumber>,
    constants: RangeConstants<TNumber>,
    size: Integer<TNumber>,
    origin: Integer<TNumber>,
    max: Integer<TNumber>,
  ): Integer<TNumber> => {
    const width = calculator.sub(max, origin);
    const multiplier = calculator.div(size, constants.oneHundred);
    const distance = calculator.round(calculator.mul(calculator.absoluteOf(width), multiplier), calculator.zero);
    const signedDistance = calculator.mul(distance, calculator.loadIntegerUnchecked(calculator.signOf(width)));
    return calculator.add(origin, signedDistance);
  };

  /* istanbul ignore next */
  const makeGetProportionalDistance = <TNumber>(
    calculator: Calculator<TNumber>,
    constants: RangeConstants<TNumber>,
    min: Integer<TNumber>,
    max: Integer<TNumber>,
    origin: Integer<TNumber>,
  ) => (x: Real<TNumber>): Real<TNumber> => {
    if (calculator.equals(x, origin)) return calculator.zero;
    if (calculator.equals(x, max)) return constants.oneHundred;
    if (calculator.equals(x, min)) return constants.oneHundred;
    if (calculator.lessThan(x, origin))
      return calculator.mul(
        calculator.div(calculator.sub(x, origin), calculator.sub(min, origin)),
        constants.oneHundred,
      );
    else
      return calculator.mul(
        calculator.div(calculator.sub(x, origin), calculator.sub(max, origin)),
        constants.oneHundred,
      );
  };

  const constantFrom = <TNumber>(
    calculator: Calculator<TNumber>,
    constants: RangeConstants<TNumber>,
    x: Integer<TNumber>,
    y: Integer<TNumber>,
    z: Integer<TNumber>,
  ): Range<TNumber> => {
    const { min, max, origin } = labelParams(calculator, x, y, z);

    return {
      getSizedBounds: () => [min, max],
      getProportionalDistance: makeGetProportionalDistance(calculator, constants, min, max, origin),
      origin,
      bounds: [min, max],
    };
  };

  const linearFrom = <TNumber>(
    calculator: Calculator<TNumber>,
    constants: RangeConstants<TNumber>,
    x: Integer<TNumber>,
    y: Integer<TNumber>,
    z: Integer<TNumber>,
  ): Range<TNumber> => {
    const { min, max, origin } = labelParams(calculator, x, y, z);

    return {
      getSizedBounds: (size) => {
        if (calculator.equals(size, calculator.zero)) return [origin, origin];

        const min0 = scaleLinear(calculator, constants, size, origin, min);
        const max0 = scaleLinear(calculator, constants, size, origin, max);

        return [min0, max0];
      },
      getProportionalDistance: makeGetProportionalDistance(calculator, constants, min, max, origin),
      origin,
      bounds: [min, max],
    };
  };

  export const createFrom = <TNumber>(
    calculator: Calculator<TNumber>,
    x: Integer<TNumber>,
    y: Integer<TNumber>,
    z: Integer<TNumber>,
    scale: ScaleMode,
  ): Range<TNumber> => {
    const constants: RangeConstants<TNumber> = {
      oneHundred: calculator.mul(calculator.ten, calculator.ten),
    };

    switch (scale) {
      case 'constant':
        return constantFrom(calculator, constants, x, y, z);
      case 'linear':
        return linearFrom(calculator, constants, x, y, z);
    }
  };
}
