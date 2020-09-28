import { Seed, Size, Tree } from './Imports';
import { PropertyFunctionFailureReason } from './PropertyFunction';

export type AnyValues = any[];

export type PropertyIterationFactory = {
  unfalsified: () => PropertyExplorationIteration.Unfalsified;
  falsified: <Values extends AnyValues>(
    counterexample: Tree<Values>,
    reason: PropertyFunctionFailureReason,
  ) => PropertyExplorationIteration.Falsified<Values>;
  discarded: () => PropertyExplorationIteration.Discarded;
  exhausted: () => PropertyExplorationIteration.Exhausted;
};

export namespace PropertyExplorationIteration {
  type BasePropertyIterationResult<Kind extends string, Props> = {
    kind: Kind;
    seed: Seed;
    size: Size;
  } & Props;

  export type Unfalsified = BasePropertyIterationResult<'unfalsified', {}>;

  export type Falsified<Values extends AnyValues> = BasePropertyIterationResult<
    'falsified',
    {
      counterexample: Tree<Values>;
      reason: PropertyFunctionFailureReason;
    }
  >;

  export type Discarded = BasePropertyIterationResult<'discarded', {}>;

  export type Exhausted = BasePropertyIterationResult<'exhausted', {}>;

  export const factory = (seed: Seed, size: Size): PropertyIterationFactory => ({
    unfalsified: (): Unfalsified => ({ kind: 'unfalsified', seed, size }),

    falsified: <Values extends AnyValues>(
      counterexample: Tree<Values>,
      reason: PropertyFunctionFailureReason,
    ): Falsified<Values> => ({
      kind: 'falsified',
      seed,
      size,
      counterexample,
      reason,
    }),

    discarded: (): Discarded => ({ kind: 'discarded', seed, size }),

    exhausted: (): Exhausted => ({ kind: 'exhausted', seed, size }),
  });
}

export type PropertyExplorationIteration<Values extends AnyValues> =
  | PropertyExplorationIteration.Unfalsified
  | PropertyExplorationIteration.Falsified<Values>
  | PropertyExplorationIteration.Discarded
  | PropertyExplorationIteration.Exhausted;
