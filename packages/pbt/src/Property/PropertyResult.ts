import { Seed, Size } from './Imports';
import { PropertyFailureReason } from './PropertyFunction';
import { AnyValues } from './PropertyIteration';

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
