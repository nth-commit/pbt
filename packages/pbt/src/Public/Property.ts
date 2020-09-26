import * as Core from '../Core';
import * as InternalProperty from '../Property';
import { RandomStream } from './RandomStream';
import { Gen, GenFunction } from './Gen';
import { pipe } from 'ix/iterable';
import { map, scan, tap } from 'ix/iterable/operators';

export type PropertyConfig = {
  shrinkPath?: number[];
};

export type AnyValues = InternalProperty.AnyValues;

export type ThrowablePredicate<Values extends AnyValues> = InternalProperty.PropertyFunction<Values>;

export type PropertyFailureReason = InternalProperty.PropertyFunctionFailureReason;

export namespace PropertyResult {
  export type Success = {
    kind: 'success';
    iteration: number;
    seed: InternalProperty.Seed;
    size: InternalProperty.Size;
  };

  export type Falsification<Values> = {
    kind: 'falsification';
    iteration: number;
    seed: InternalProperty.Seed;
    size: InternalProperty.Size;
    counterexample: {
      path: number[];
      values: Values;
    };
  };
}

export type PropertyResult<Values extends AnyValues> = PropertyResult.Success | PropertyResult.Falsification<Values>;

type ExploreAndShrinkIteration<Values extends AnyValues> =
  | {
      kind: 'explore';
      iteration: InternalProperty.PropertyIteration<Values>;
    }
  | {
      kind: 'shrink';
      iteration: InternalProperty.CounterexampleIteration<Values>;
    };

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

type GenFunctions<Values extends AnyValues> = { [P in keyof Values]: GenFunction<Values[P]> };

const exploreThenShrink = function* <Values extends AnyValues>(
  genFunctions: GenFunctions<Values>,
  f: ThrowablePredicate<Values>,
  seed: Core.Seed,
  size: Core.Size,
): Iterable<ExploreAndShrinkIteration<Values>> {
  let lastIteration: InternalProperty.PropertyIteration<Values> = {
    kind: 'success',
    seed,
    size,
  } as InternalProperty.PropertyIteration<Values>;

  yield* pipe(
    InternalProperty.explore(genFunctions, f)(seed, size),
    tap((iteration) => {
      lastIteration = iteration;
    }),
    map(
      (iteration): ExploreAndShrinkIteration<Values> => ({
        kind: 'explore',
        iteration,
      }),
    ),
  );

  if (lastIteration.kind === 'falsification') {
    yield* pipe(
      InternalProperty.shrinkCounterexample(f, lastIteration.counterexample),
      map(
        (iteration): ExploreAndShrinkIteration<Values> => ({
          kind: 'shrink',
          iteration,
        }),
      ),
    );
  }
};

const transitionFromSuccess = <Values extends AnyValues>(
  previousResult: PropertyResult.Success,
  currentIteration: ExploreAndShrinkIteration<Values>,
): PropertyResult<Values> => {
  switch (currentIteration.kind) {
    case 'shrink':
      throw new Error('Fatal: Unexpected state');
    case 'explore': {
      switch (currentIteration.iteration.kind) {
        case 'success':
          return {
            kind: 'success',
            iteration: previousResult.iteration + 1,
            seed: currentIteration.iteration.seed,
            size: currentIteration.iteration.size,
          };
        case 'falsification': {
          return {
            kind: 'falsification',
            iteration: previousResult.iteration + 1,
            seed: currentIteration.iteration.seed,
            size: currentIteration.iteration.size,
            counterexample: {
              path: [],
              values: InternalProperty.Tree.outcome(currentIteration.iteration.counterexample),
            },
          };
        }
        case 'discard':
        case 'exhaustion':
          // TODO
          return previousResult;
      }
    }
  }
};

const transitionFromFalsification = <Values extends AnyValues>(
  previousResult: PropertyResult.Falsification<Values>,
  currentIteration: ExploreAndShrinkIteration<Values>,
): PropertyResult<Values> => {
  switch (currentIteration.kind) {
    case 'explore':
      throw new Error('Fatal: Unexpected state');
    case 'shrink': {
      switch (currentIteration.iteration.kind) {
        case 'confirmed':
          return {
            kind: 'falsification',
            iteration: previousResult.iteration,
            counterexample: {
              path: currentIteration.iteration.path,
              values: currentIteration.iteration.values,
            },
            seed: previousResult.seed,
            size: previousResult.size,
          };
        case 'rejected': {
          // TODO: Count non-falsified shrinks
          return previousResult;
        }
      }
    }
  }
};

export class Property<Values extends AnyValues> implements RandomStream<PropertyResult<Values>> {
  constructor(
    private readonly gens: Gens<Values>,
    private readonly f: ThrowablePredicate<Values>,
    private readonly config: PropertyConfig = {},
  ) {}

  configure(config: PropertyConfig): Property<Values> {
    return new Property<Values>(this.gens, this.f, config);
  }

  run(seed: Core.Seed, size: Core.Size): Iterable<PropertyResult<Values>> {
    const genFunctions = this.gens.map((gen) => gen.genFunction) as GenFunctions<Values>;
    return pipe(
      exploreThenShrink(genFunctions, this.f, seed, size),
      scan<ExploreAndShrinkIteration<Values>, PropertyResult<Values>>({
        seed: {
          kind: 'success',
          iteration: 0,
          seed,
          size,
        },
        callback: (acc, curr) =>
          acc.kind === 'success' ? transitionFromSuccess(acc, curr) : transitionFromFalsification(acc, curr),
      }),
    );
  }
}

export type PropertyArgs<Values extends AnyValues> = [...Gens<Values>, ThrowablePredicate<Values>];

export const property = <Values extends AnyValues>(...args: PropertyArgs<Values>): Property<Values> => {
  // TODO: Validation
  const gens = args.slice(0, args.length - 1) as Gens<Values>;
  const f = args[args.length - 1] as ThrowablePredicate<Values>;
  return new Property<Values>(gens, f);
};
