import { Seed, Size } from './Imports';
import { PropertyFunctionFailureReason } from './PropertyFunction';
import { AnyValues } from './PropertyIteration';

export namespace PropertyResult {
  export type Unfalsified = {
    kind: 'unfalsified';
    iteration: number;
    discards: number;
    seed: Seed;
    size: Size;
  };

  export type Falsified<Values extends AnyValues> = {
    kind: 'falsified';
    iteration: number;
    discards: number;
    seed: Seed;
    size: Size;
    counterexample: Values;
    counterexamplePath: number[];
    shrinkIteration: number;
    reason: PropertyFunctionFailureReason;
  };

  export type Exhausted = {
    kind: 'exhausted';
    iteration: number;
    discards: number;
    seed: Seed;
    size: Size;
  };
}

export type PropertyResult<Values extends AnyValues> =
  | PropertyResult.Unfalsified
  | PropertyResult.Falsified<Values>
  | PropertyResult.Exhausted;
