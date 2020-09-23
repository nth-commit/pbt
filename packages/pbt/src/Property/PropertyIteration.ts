import { Seed, Size, Tree } from './Imports';
import { PropertyFunctionFailureReason } from './PropertyFunction';

export type AnyValues = any[];

export type Trees<Values extends AnyValues> = { [P in keyof Values]: Tree<Values[P]> };

export type PropertyIterationFactory = {
  success: (size: Size) => PropertyIteration.Success;
  falsification: <Values extends AnyValues>(
    size: Size,
    trees: Trees<Values>,
    reason: PropertyFunctionFailureReason,
  ) => PropertyIteration.Falsification<Values>;
  discard: (size: Size) => PropertyIteration.Discard;
  exhaustion: (size: Size) => PropertyIteration.Exhaustion;
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
      trees: Trees<Values>;
      reason: PropertyFunctionFailureReason;
    }
  >;

  export type Discard = BasePropertyIterationResult<'discard', {}>;

  export type Exhaustion = BasePropertyIterationResult<'exhaustion', {}>;

  export const factory = (seed: Seed): PropertyIterationFactory => ({
    success: (size: Size): Success => ({ kind: 'success', seed, size }),

    falsification: <Values extends AnyValues>(
      size: Size,
      trees: Trees<Values>,
      reason: PropertyFunctionFailureReason,
    ): Falsification<Values> => ({
      kind: 'falsification',
      seed,
      size,
      trees,
      reason,
    }),

    discard: (size: Size): Discard => ({ kind: 'discard', seed, size }),

    exhaustion: (size: Size): Exhaustion => ({ kind: 'exhaustion', seed, size }),
  });
}

export type PropertyIteration<Values extends AnyValues> =
  | PropertyIteration.Success
  | PropertyIteration.Falsification<Values>
  | PropertyIteration.Discard
  | PropertyIteration.Exhaustion;
