import { Seed, Size, Tree } from './Imports';
import { PropertyFunctionFailureReason } from './PropertyFunction';

export type AnyValues = any[];

export type Trees<Values extends AnyValues> = { [P in keyof Values]: Tree<Values[P]> };

export type PropertyIterationFactory = {
  success: () => PropertyIteration.Success;
  falsification: <Values extends AnyValues>(
    counterexample: Trees<Values>,
    reason: PropertyFunctionFailureReason,
  ) => PropertyIteration.Falsification<Values>;
  discard: () => PropertyIteration.Discard;
  exhaustion: () => PropertyIteration.Exhaustion;
};

export namespace PropertyIteration {
  type BasePropertyIterationResult<Kind extends string, Props> = {
    kind: Kind;
    seed: Seed;
    size: Size;
  } & Props;

  export type Success = BasePropertyIterationResult<'success', {}>;

  export type Falsification<Values extends AnyValues> = BasePropertyIterationResult<
    'falsification',
    {
      counterexample: Trees<Values>;
      reason: PropertyFunctionFailureReason;
    }
  >;

  export type Discard = BasePropertyIterationResult<'discard', {}>;

  export type Exhaustion = BasePropertyIterationResult<'exhaustion', {}>;

  export const factory = (seed: Seed, size: Size): PropertyIterationFactory => ({
    success: (): Success => ({ kind: 'success', seed, size }),

    falsification: <Values extends AnyValues>(
      counterexample: Trees<Values>,
      reason: PropertyFunctionFailureReason,
    ): Falsification<Values> => ({
      kind: 'falsification',
      seed,
      size,
      counterexample,
      reason,
    }),

    discard: (): Discard => ({ kind: 'discard', seed, size }),

    exhaustion: (): Exhaustion => ({ kind: 'exhaustion', seed, size }),
  });
}

export type PropertyIteration<Values extends AnyValues> =
  | PropertyIteration.Success
  | PropertyIteration.Falsification<Values>
  | PropertyIteration.Discard
  | PropertyIteration.Exhaustion;
