import { RandomStream, Seed, Size } from '../Core';
import { Complexity } from '../GenTree';

export namespace PropertyFailureReason {
  export type ReturnedFalse = { kind: 'returnedFalse' };
  export type ThrewError = { kind: 'threwError'; error: unknown };
}

export type PropertyFailureReason = PropertyFailureReason.ReturnedFalse | PropertyFailureReason.ThrewError;

export type Counterexample<Ts extends any[]> = {
  value: Ts;
  complexity: Complexity;
  path: number[];
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
    seed: number;
    size: Size;
  };

  export type Fail<Ts extends any[]> = {
    kind: 'fail';
    seed: number;
    size: Size;
    counterexample: Counterexample<Ts>;
    shrinks: Iterable<ShrinkIteration<Ts>>;
  };

  export type Discard = {
    kind: 'discard';
    seed: number;
    size: Size;
    value: unknown;
    predicate: Function;
  };

  export type Error = {
    kind: 'error';
    message: string;
    seed: number;
    size: Size;
  };
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
  path: number[];
};

export type Property<Ts extends any[]> = RandomStream<PropertyIteration<Ts>, Partial<PropertyConfig>>;
