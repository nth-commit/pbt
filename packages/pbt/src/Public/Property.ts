import { map } from 'ix/iterable/operators';
import * as Core from '../Core';
import * as InternalProperty from '../Property';
import { RandomStream } from './RandomStream';
import { Gen, GenFunction } from './Gen';
import { pipe, of } from 'ix/iterable';

export type PropertyConfig = {
  counterexamplePath?: string;
};

export type AnyValues = InternalProperty.AnyValues;

export namespace PropertyResult {
  export type Unfalsified = {
    kind: 'unfalsified';
    iterations: number;
    discards: number;
    seed: number;
    size: number;
  };

  export type Falsified<Values extends AnyValues> = {
    kind: 'falsified';
    iterations: number;
    discards: number;
    seed: number;
    size: number;
    counterexample: Values;
    counterexamplePath: string;
    shrinkIterations: number;
    reason: InternalProperty.PropertyFailureReason;
  };

  export type Exhausted = {
    kind: 'exhausted';
    iterations: number;
    discards: number;
    seed: number;
    size: number;
  };
}

export type PropertyResult<Values extends AnyValues> =
  | PropertyResult.Unfalsified
  | PropertyResult.Falsified<Values>
  | PropertyResult.Exhausted;

export type PropertyFunction<Values extends AnyValues> = InternalProperty.PropertyFunction<Values>;

export type PropertyFailureReason = InternalProperty.PropertyFailureReason;

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

type GenFunctions<Values extends AnyValues> = { [P in keyof Values]: GenFunction<Values[P]> };

const mapInternalResultToPublic = <Values extends AnyValues>(
  internalResult: InternalProperty.PropertyResult<Values>,
): PropertyResult<Values> => {
  const basePublicResult = {
    ...internalResult,
    seed: internalResult.seed.valueOf(),
  };

  switch (basePublicResult.kind) {
    case 'unfalsified':
    case 'exhausted':
      return basePublicResult;
    case 'falsified':
      return {
        ...basePublicResult,
        counterexamplePath: basePublicResult.counterexamplePath.join(':'),
      };
  }
};

export class Property<Values extends AnyValues> implements RandomStream<PropertyResult<Values>> {
  constructor(
    private readonly gens: Gens<Values>,
    private readonly f: PropertyFunction<Values>,
    private readonly config: PropertyConfig = {},
  ) {}

  configure(config: PropertyConfig): Property<Values> {
    return new Property<Values>(this.gens, this.f, config);
  }

  run(seed: number, size: number): Iterable<PropertyResult<Values>> {
    const internalGens = this.gens.map((gen) => gen.genFunction) as GenFunctions<Values>;
    const internalSeed = Core.Seed.create(seed);

    if (this.config.counterexamplePath === undefined) {
      const internalProperty = InternalProperty.property(internalGens, this.f);
      const internalResults = internalProperty(internalSeed, size);

      return pipe(internalResults, map(mapInternalResultToPublic));
    } else {
      const internalCounterexamplePath = this.config.counterexamplePath
        ? this.config.counterexamplePath.split(':').map((n) => parseInt(n))
        : [];

      const internalResult = InternalProperty.reproduceFailure(
        internalGens,
        this.f,
        internalSeed,
        size,
        internalCounterexamplePath,
      );

      switch (internalResult.kind) {
        case 'validationError':
        case 'unreproducible':
          throw new Error(`Fatal: Unhandled - ${JSON.stringify(internalResult)}`);
        case 'reproducible':
          return of<PropertyResult<Values>>({
            kind: 'falsified',
            iterations: 1,
            discards: 0,
            shrinkIterations: 1,
            reason: null as any,
            counterexample: internalResult.counterexample,
            counterexamplePath: this.config.counterexamplePath,
            seed: seed,
            size: size,
          });
      }
    }
  }
}

export type PropertyArgs<Values extends AnyValues> = [...Gens<Values>, PropertyFunction<Values>];

export const property = <Values extends AnyValues>(...args: PropertyArgs<Values>): Property<Values> => {
  // TODO: Validation
  const gens = args.slice(0, args.length - 1) as Gens<Values>;
  const f = args[args.length - 1] as PropertyFunction<Values>;
  return new Property<Values>(gens, f);
};
