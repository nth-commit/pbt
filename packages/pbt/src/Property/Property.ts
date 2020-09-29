import { Gen, Seed, Size } from './Imports';

export type AnyValues = any[];

export type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

export type Property<Values extends AnyValues> = (seed: Seed, size: Size) => Iterable<PropertyResult<Values>>;

export namespace PropertyResult {
  export type Unfalsified = {
    kind: 'unfalsified';
    iterations: number;
    discards: number;
    seed: Seed;
    size: Size;
  };

  export type Falsified<Values extends AnyValues> = {
    kind: 'falsified';
    iterations: number;
    discards: number;
    seed: Seed;
    size: Size;
    counterexample: Values;
    counterexamplePath: number[];
    shrinkIterations: number;
    reason: PropertyFailureReason;
  };

  export type Exhausted = {
    kind: 'exhausted';
    iterations: number;
    discards: number;
    seed: Seed;
    size: Size;
  };

  export type Error = {
    kind: 'error';
    iterations: number;
    discards: number;
    seed: Seed;
    size: Size;
  };
}

export type PropertyResult<Values extends AnyValues> =
  | PropertyResult.Unfalsified
  | PropertyResult.Falsified<Values>
  | PropertyResult.Exhausted
  | PropertyResult.Error;

export namespace PropertyFailureReason {
  export type ReturnedFalse = { kind: 'returnedFalse' };

  export type ThrewError = { kind: 'threwError'; error: unknown };
}

export type PropertyFailureReason = PropertyFailureReason.ReturnedFalse | PropertyFailureReason.ThrewError;

export namespace PropertyFunctionInvocation {
  export type Success = { kind: 'success' };

  export type Failure = { kind: 'failure'; reason: PropertyFailureReason };

  export const success = (): Success => ({ kind: 'success' });

  export const returnedFalse = (): Failure => ({
    kind: 'failure',
    reason: { kind: 'returnedFalse' },
  });

  export const threwError = (error: unknown): Failure => ({
    kind: 'failure',
    reason: { kind: 'threwError', error },
  });
}

export type PropertyFunctionInvocation = PropertyFunctionInvocation.Failure | PropertyFunctionInvocation.Success;

export type PropertyFunction<Values extends AnyValues> = (...args: Values) => boolean | void;

export namespace PropertyFunction {
  export const invoke = <Values extends AnyValues>(
    f: PropertyFunction<Values>,
    values: Values,
  ): PropertyFunctionInvocation => {
    try {
      return f(...values) === false ? PropertyFunctionInvocation.returnedFalse() : PropertyFunctionInvocation.success();
    } catch (error) {
      return PropertyFunctionInvocation.threwError(error);
    }
  };
}
