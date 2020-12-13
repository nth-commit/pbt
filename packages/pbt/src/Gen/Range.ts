import { Calculator } from '../Number';

export type ScaleMode = 'constant' | 'linear';

export type Bounds<TIntegral> = [min: TIntegral, max: TIntegral];

export type Range<TIntegral> = {
  getSizedBounds: (size: TIntegral) => Bounds<TIntegral>;
  getProportionalDistance: (n: TIntegral) => TIntegral;
  origin: TIntegral;
  bounds: Bounds<TIntegral>;
};

export namespace Range {
  type RangeConstants<TIntegral> = {
    oneHundred: TIntegral;
  };

  const labelParams = <TIntegral>(
    calculator: Calculator<TIntegral>,
    x: TIntegral,
    y: TIntegral,
    z: TIntegral,
  ): { min: TIntegral; max: TIntegral; origin: TIntegral } => {
    const [min, origin, max] = [x, y, z].sort(calculator.compare);
    return { min, max, origin };
  };

  const scaleLinear = <TIntegral>(
    calculator: Calculator<TIntegral>,
    constants: RangeConstants<TIntegral>,
    size: TIntegral,
    origin: TIntegral,
    max: TIntegral,
  ): TIntegral => {
    const width = calculator.sub(max, origin);
    const multiplier = calculator.div(size, constants.oneHundred);
    const diff = calculator.mul(
      calculator.round(calculator.mul(calculator.abs(width), multiplier), calculator.zero),
      calculator.fromNumberUnsafe(calculator.sign(width)),
    );
    return calculator.add(origin, diff);
  };

  /* istanbul ignore next */
  const makeGetProportionalDistance = <TIntegral>(
    calculator: Calculator<TIntegral>,
    constants: RangeConstants<TIntegral>,
    min: TIntegral,
    max: TIntegral,
    origin: TIntegral,
  ) => (x: TIntegral): TIntegral => {
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

  const constantFrom = <TIntegral>(
    calculator: Calculator<TIntegral>,
    constants: RangeConstants<TIntegral>,
    x: TIntegral,
    y: TIntegral,
    z: TIntegral,
  ): Range<TIntegral> => {
    const { min, max, origin } = labelParams(calculator, x, y, z);

    return {
      getSizedBounds: () => [min, max],
      getProportionalDistance: makeGetProportionalDistance(calculator, constants, min, max, origin),
      origin,
      bounds: [min, max],
    };
  };

  const linearFrom = <TIntegral>(
    calculator: Calculator<TIntegral>,
    constants: RangeConstants<TIntegral>,
    x: TIntegral,
    y: TIntegral,
    z: TIntegral,
  ): Range<TIntegral> => {
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

  export const createFrom = <TIntegral>(
    calculator: Calculator<TIntegral>,
    x: TIntegral,
    y: TIntegral,
    z: TIntegral,
    scale: ScaleMode,
  ): Range<TIntegral> => {
    const constants: RangeConstants<TIntegral> = {
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
