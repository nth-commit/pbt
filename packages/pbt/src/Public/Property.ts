import * as Core from '../Core';
import * as InternalProperty from '../Property';
import { RandomStream } from './RandomStream';
import { Gen, GenFunction } from './Gen';

export type PropertyConfig = {
  shrinkPath?: number[];
};

export type AnyValues = InternalProperty.AnyValues;

export type ThrowablePredicate<Values extends AnyValues> = InternalProperty.PropertyFunction<Values>;

export type PropertyFailureReason = InternalProperty.PropertyFunctionFailureReason;

export type PropertyResult<Values extends AnyValues> = InternalProperty.PropertyResult<Values>;

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

type GenFunctions<Values extends AnyValues> = { [P in keyof Values]: GenFunction<Values[P]> };

export class Property<Values extends AnyValues> implements RandomStream<InternalProperty.PropertyResult<Values>> {
  constructor(
    private readonly gens: Gens<Values>,
    private readonly f: ThrowablePredicate<Values>,
    private readonly config: PropertyConfig = {},
  ) {}

  configure(config: PropertyConfig): Property<Values> {
    return new Property<Values>(this.gens, this.f, config);
  }

  run(seed: Core.Seed, size: Core.Size): Iterable<InternalProperty.PropertyResult<Values>> {
    const genFunctions = this.gens.map((gen) => gen.genFunction) as GenFunctions<Values>;
    return InternalProperty.property(genFunctions, this.f)(seed, size);
  }
}

export type PropertyArgs<Values extends AnyValues> = [...Gens<Values>, ThrowablePredicate<Values>];

export const property = <Values extends AnyValues>(...args: PropertyArgs<Values>): Property<Values> => {
  // TODO: Validation
  const gens = args.slice(0, args.length - 1) as Gens<Values>;
  const f = args[args.length - 1] as ThrowablePredicate<Values>;
  return new Property<Values>(gens, f);
};
