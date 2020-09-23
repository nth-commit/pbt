import * as Core from '../Core';
import * as InternalProperty from '../Property';
import { RandomStream } from './RandomStream';
import { Gen, GenFunction } from './Gen';
import { pipe } from 'ix/iterable';
import { tap } from 'ix/iterable/operators';

export type PropertyConfig = {
  shrinkPath?: number[];
};

export type AnyValues = InternalProperty.AnyValues;

export type ThrowablePredicate<Values extends AnyValues> = InternalProperty.PropertyFunction<Values>;

export type PropertyIteration<Values extends AnyValues> = InternalProperty.PropertyIteration<Values>;

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

type GenFunctions<Values extends AnyValues> = { [P in keyof Values]: GenFunction<Values[P]> };

const exploreThenShrink = function* <Values extends AnyValues>(
  genFunctions: GenFunctions<Values>,
  f: ThrowablePredicate<Values>,
  seed: Core.Seed,
  size: Core.Size,
): Iterable<PropertyIteration<Values>> {
  let falsification: InternalProperty.PropertyIteration.Falsification<Values> | null = null;

  yield* pipe(
    InternalProperty.explore(genFunctions, f)(seed, size),
    tap((propertyIteration) => {
      if (propertyIteration.kind === 'falsification') {
        falsification = propertyIteration;
      }
    }),
  );

  if (falsification !== null) {
    const realizedFalsification = falsification as InternalProperty.PropertyIteration.Falsification<Values>;
    yield* InternalProperty.shrinkCounterexample(realizedFalsification.counterexample, f);
  }
};

export class Property<Values extends AnyValues> implements RandomStream<PropertyIteration<Values>> {
  constructor(
    private readonly gens: Gens<Values>,
    private readonly f: ThrowablePredicate<Values>,
    private readonly config: PropertyConfig = {},
  ) {}

  configure(config: PropertyConfig): Property<Values> {
    return new Property<Values>(this.gens, this.f, config);
  }

  run(seed: Core.Seed, size: Core.Size): Iterable<PropertyIteration<Values>> {
    const genFunctions = this.gens.map((gen) => gen.genFunction) as GenFunctions<Values>;
    return exploreThenShrink(genFunctions, this.f, seed, size);
  }
}

export type PropertyArgs<Values extends AnyValues> = [...Gens<Values>, ThrowablePredicate<Values>];

export const property = <Values extends AnyValues>(...args: PropertyArgs<Values>): Property<Values> => {
  // TODO: Validation
  const gens = args.slice(0, args.length - 1) as Gens<Values>;
  const f = args[args.length - 1] as ThrowablePredicate<Values>;
  return new Property<Values>(gens, f);
};
