import { Result } from '../Core';

type Brand<Ids extends string> = { [Id in Ids as `__brand_${Id}`]: never };

type RealBrand = Brand<'real'>;
type IntegerBrand = Brand<'integer'> & RealBrand;
type NaturalBrand = Brand<'natural'> & IntegerBrand;
type ZeroBrand = Brand<'zero'> & NaturalBrand;
type OneBrand = Brand<'one'> & NaturalBrand;

export type Real<TNumber> = TNumber & RealBrand;
export type Integer<TNumber> = TNumber & IntegerBrand;
export type Natural<TNumber> = TNumber & NaturalBrand;
export type Zero<TNumber> = TNumber & ZeroBrand;
export type One<TNumber> = TNumber & OneBrand;

export type LoadNumberErrorCode = 'parsedNaN' | 'parsedInfinity';
export type LoadIntegerErrorCode = LoadNumberErrorCode | 'parsedDecimal';
export type LoadNaturalErrorCode = LoadIntegerErrorCode | 'parsedNegative';

export type Sign = -1 | 0 | 1;

export type CalculatorEngine<TNumber> = {
  load(x: number | TNumber): TNumber;
  unload(x: TNumber): number;
  add(l: TNumber, r: TNumber): TNumber;
  sub(l: TNumber, r: TNumber): TNumber;
  mul(l: TNumber, r: TNumber): TNumber;
  div(l: TNumber, r: TNumber): TNumber;
  mod(x: TNumber, r: TNumber): TNumber;
  pow(x: TNumber, e: TNumber): TNumber;
  round(x: TNumber, p: TNumber): TNumber;
  compare(l: TNumber, r: TNumber): Sign;
};

export type Calculator<TNumber> = {
  readonly id: unknown;

  readonly zero: Zero<TNumber>;
  readonly one: One<TNumber>;
  readonly ten: Natural<TNumber>;

  load(x: number | TNumber): Result<Real<TNumber>, LoadNumberErrorCode>;
  loadUnchecked(x: number | TNumber): Real<TNumber>;
  loadInteger(x: number | TNumber): Result<Integer<TNumber>, LoadIntegerErrorCode>;
  loadIntegerUnchecked(x: number | TNumber): Integer<TNumber>;
  loadNatural(x: number | TNumber): Result<Natural<TNumber>, LoadNaturalErrorCode>;
  loadNaturalUnchecked(x: number | TNumber): Natural<TNumber>;

  unload(x: Real<TNumber>): number;
  unloadInteger(x: Integer<TNumber>): number;

  add(l: Natural<TNumber>, r: Natural<TNumber>): Natural<TNumber>;
  add(l: Integer<TNumber>, r: Integer<TNumber>): Integer<TNumber>;
  add(l: Real<TNumber>, r: Real<TNumber>): Real<TNumber>;
  sub(l: Integer<TNumber>, r: Integer<TNumber>): Integer<TNumber>;
  sub(l: Real<TNumber>, r: Real<TNumber>): Real<TNumber>;
  mul(l: Natural<TNumber>, r: Natural<TNumber>): Natural<TNumber>;
  mul(l: Integer<TNumber>, r: Integer<TNumber>): Integer<TNumber>;
  mul(l: Real<TNumber>, r: Real<TNumber>): Real<TNumber>;
  div(l: Real<TNumber>, r: Real<TNumber>): Real<TNumber>;
  mod(x: Real<TNumber>, q: Real<TNumber>): Real<TNumber>;
  pow(x: Natural<TNumber>, e: Natural<TNumber>): Natural<TNumber>;
  pow(x: Integer<TNumber>, e: Natural<TNumber>): Integer<TNumber>;
  pow(x: Integer<TNumber>, e: Integer<TNumber>): Real<TNumber>;

  round(x: Real<TNumber>, p: Zero<TNumber>): Integer<TNumber>;
  round(x: Real<TNumber>, p: Integer<TNumber>): Real<TNumber>;

  compare(l: Real<TNumber>, r: Real<TNumber>): Sign;
  equals(l: Real<TNumber>, r: Real<TNumber>): boolean;
  lessThan(l: Real<TNumber>, r: Real<TNumber>): boolean;
  lessThanEquals(l: Real<TNumber>, r: Real<TNumber>): boolean;
  greaterThan(l: Real<TNumber>, r: Real<TNumber>): boolean;
  greaterThanEquals(l: Real<TNumber>, r: Real<TNumber>): boolean;

  signOf(x: Real<TNumber>): Sign;
  negationOf(x: Integer<TNumber>): Integer<TNumber>;
  negationOf(x: Real<TNumber>): Real<TNumber>;
  absoluteOf(x: Integer<TNumber>): Integer<TNumber>;
  absoluteOf(x: Real<TNumber>): Real<TNumber>;
  precisionOf(x: Real<TNumber>): Natural<TNumber>;
};

export const Calculator = {
  create: <TNumber>(engine: CalculatorEngine<TNumber>): Calculator<TNumber> => {
    class CalculatorImpl implements Calculator<TNumber> {
      readonly id: unknown;

      readonly zero: Zero<TNumber>;
      readonly one: One<TNumber>;
      readonly ten: Natural<TNumber>;

      constructor(private readonly engine: CalculatorEngine<TNumber>) {
        this.id = engine;
        this.zero = this.loadIntegerUnchecked(0) as Zero<TNumber>;
        this.one = this.loadIntegerUnchecked(1) as One<TNumber>;
        this.ten = this.loadNaturalUnchecked(10);
      }

      load = (x: number | TNumber): Result<Real<TNumber>, LoadNumberErrorCode> => {
        if (Number.isNaN(x)) return Result.ofError('parsedNaN');
        if (Number.isFinite(x) === false) return Result.ofError('parsedInfinity');
        return Result.ofValue(this.loadUnchecked(x));
      };

      loadUnchecked = (x: number | TNumber): Real<TNumber> => this.engine.load(x) as Real<TNumber>;

      loadInteger = (x: number): Result<Integer<TNumber>, LoadIntegerErrorCode> =>
        this.load(x).flatMap((x) =>
          this.equals(this.precisionOf(x), this.zero)
            ? Result.ofValue(this.loadIntegerUnchecked(x))
            : Result.ofError('parsedDecimal'),
        );

      loadIntegerUnchecked = (x: number | TNumber): Integer<TNumber> => this.engine.load(x) as Integer<TNumber>;

      loadNatural = (x: number): Result<Natural<TNumber>, LoadNaturalErrorCode> =>
        this.loadInteger(x).flatMap((x) =>
          this.greaterThanEquals(x, this.zero)
            ? Result.ofValue(this.loadNaturalUnchecked(x))
            : Result.ofError('parsedNegative'),
        );

      loadNaturalUnchecked = (x: number | TNumber): Natural<TNumber> => this.engine.load(x) as Natural<TNumber>;

      unload = (x: Real<TNumber>): number => this.engine.unload(x);

      unloadInteger = (x: Integer<TNumber>): number => this.engine.unload(x);

      add = (l: Real<TNumber>, r: Real<TNumber>) => this.engine.add(l, r) as Natural<TNumber>;

      sub = (l: Real<TNumber>, r: Real<TNumber>) => this.engine.sub(l, r) as Integer<TNumber>;

      mul = (l: Real<TNumber>, r: Real<TNumber>) => this.engine.mul(l, r) as Natural<TNumber>;

      div = (l: Real<TNumber>, r: Real<TNumber>) => this.engine.div(l, r) as Real<TNumber>;

      mod = (x: Real<TNumber>, q: Real<TNumber>) => this.engine.mod(x, q) as Real<TNumber>;

      pow = (x: Integer<TNumber>, e: Integer<TNumber>) => this.engine.pow(x, e) as Natural<TNumber>;

      round = (x: Real<TNumber>, p: Integer<TNumber>) => this.engine.round(x, p) as Integer<TNumber>;

      compare = (l: Real<TNumber>, r: Real<TNumber>): Sign => this.engine.compare(l, r);

      equals = (l: Real<TNumber>, r: Real<TNumber>): boolean => this.engine.compare(l, r) === 0;

      lessThan = (l: Real<TNumber>, r: Real<TNumber>): boolean => this.engine.compare(l, r) === -1;

      lessThanEquals = (l: Real<TNumber>, r: Real<TNumber>): boolean => this.lessThan(l, r) || this.equals(l, r);

      greaterThan = (l: Real<TNumber>, r: Real<TNumber>): boolean => this.engine.compare(l, r) === 1;

      greaterThanEquals = (l: Real<TNumber>, r: Real<TNumber>): boolean => this.greaterThan(l, r) || this.equals(l, r);

      signOf = (x: Real<TNumber>): Sign => this.compare(x, this.zero);

      negationOf = (x: Real<TNumber>) => this.sub(this.zero, x);

      absoluteOf = (x: Real<TNumber>) =>
        (this.greaterThanEquals(x, this.zero) ? x : this.negationOf(x)) as Integer<TNumber>;

      precisionOf = (x: Real<TNumber>): Natural<TNumber> => {
        let current = this.absoluteOf(x);
        let count: Integer<TNumber> = this.zero;

        while (this.greaterThan(this.mod(current, this.one), this.zero)) {
          count = this.add(count, this.one);
          current = this.mul(current, this.ten);
        }

        return this.loadNaturalUnchecked(count);
      };
    }

    return new CalculatorImpl(engine);
  },
};
