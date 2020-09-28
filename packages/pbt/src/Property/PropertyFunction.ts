import { AnyValues } from './PropertyIteration';

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
