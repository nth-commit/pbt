import { Size } from '../Core';
import { Complexity } from '../GenTree';
import { GenIteration } from '../Gen';

export namespace PropertyFailureReason {
  export type ReturnedFalse = { kind: 'returnedFalse' };
  export type ThrewError = { kind: 'threwError'; error: unknown };
}

export type PropertyFailureReason = PropertyFailureReason.ReturnedFalse | PropertyFailureReason.ThrewError;

export type Counterexample<Ts extends any[]> = {
  value: Ts;
  complexity: Complexity;
  path: string;
  reason: PropertyFailureReason;
};

export namespace ShrinkIteration {
  export type Pass = {
    kind: 'pass';
  };

  export type Fail<Ts extends any[]> = {
    kind: 'fail';
    counterexample: Counterexample<Ts>;
  };
}

export type ShrinkIteration<Ts extends any[]> = ShrinkIteration.Pass | ShrinkIteration.Fail<Ts>;

export namespace PropertyIteration {
  export type Pass = {
    kind: 'pass';
  } & GenIteration.Base;

  export type Fail<Ts extends any[]> = {
    kind: 'fail';
    counterexample: Counterexample<Ts>;
    shrinks: Iterable<ShrinkIteration<Ts>>;
  } & GenIteration.Base;

  export type Discard = GenIteration.Discard;

  export type Error = GenIteration.Error;
}

export type PropertyIteration<Ts extends any[]> =
  | PropertyIteration.Pass
  | PropertyIteration.Fail<Ts>
  | PropertyIteration.Discard
  | PropertyIteration.Error;

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

export type PropertyFunction<Ts extends any[]> = (...args: Ts) => boolean | void;

export namespace PropertyFunction {
  export const invoke = <Ts extends any[]>(f: PropertyFunction<Ts>, values: Ts): PropertyFunctionInvocation => {
    try {
      return f(...values) === false ? PropertyFunctionInvocation.returnedFalse() : PropertyFunctionInvocation.success();
    } catch (error) {
      return PropertyFunctionInvocation.threwError(error);
    }
  };
}

export type PropertyConfig = {
  path?: string;
  size?: Size;
};

export type Property<Ts extends any[]> = {
  run(seed: number, iterations: number, config?: PropertyConfig): Iterable<PropertyIteration<Ts>>;
};
