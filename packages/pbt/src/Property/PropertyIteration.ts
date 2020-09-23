import { Seed, Size, Tree } from './Imports';
import { PropertyFunctionFailureReason } from './PropertyFunction';

export type AnyValues = any[];

export type Trees<Values extends AnyValues> = { [P in keyof Values]: Tree<Values[P]> };

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

  export const factory = (seed: Seed) => ({
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
  });
}

export type PropertyIteration<Values extends AnyValues> =
  | PropertyIteration.Success
  | PropertyIteration.Falsification<Values>;
