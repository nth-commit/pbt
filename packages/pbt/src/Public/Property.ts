import { map } from 'ix/iterable/operators';
import * as Core from '../Core';
import * as InternalProperty from '../Property';
import { RandomStream } from './RandomStream';
import { Gen, GenFunction } from './Gen';
import { pipe } from 'ix/iterable';

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

  export type Error = {
    kind: 'error';
    iterations: number;
    discards: number;
    seed: number;
    size: number;
  };
}

export type PropertyResult<Values extends AnyValues> =
  | PropertyResult.Unfalsified
  | PropertyResult.Falsified<Values>
  | PropertyResult.Exhausted
  | PropertyResult.Error;

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
    case 'error':
      return basePublicResult;
    case 'falsified':
      return {
        ...basePublicResult,
        counterexamplePath: basePublicResult.counterexamplePath.join(':'),
      };
  }
};

const handleExplore = <Values extends AnyValues>(
  explore: typeof InternalProperty.explore,
  gens: GenFunctions<Values>,
  f: PropertyFunction<Values>,
  seed: Core.Seed,
  size: Core.Size,
): Iterable<PropertyResult<Values>> => {
  const internalProperty = explore(gens, f);
  const internalResults = internalProperty(seed, size);
  return pipe(internalResults, map(mapInternalResultToPublic));
};

const handleReproduce = <Values extends AnyValues>(
  reproduce: typeof InternalProperty.reproduce,
  gens: GenFunctions<Values>,
  f: PropertyFunction<Values>,
  seed: Core.Seed,
  size: Core.Size,
  counterexamplePath: string,
): Iterable<PropertyResult<Values>> => {
  const internalCounterexamplePath = counterexamplePath ? counterexamplePath.split(':').map((n) => parseInt(n)) : [];
  const internalProperty = reproduce(gens, f, internalCounterexamplePath);
  const internalResults = internalProperty(seed, size);
  return pipe(internalResults, map(mapInternalResultToPublic));
};

export class Property<Values extends AnyValues> implements RandomStream<PropertyResult<Values>> {
  constructor(
    private readonly gens: Gens<Values>,
    private readonly f: PropertyFunction<Values>,
    private readonly config: PropertyConfig = {},
    private readonly explore: typeof InternalProperty.explore = InternalProperty.explore,
    private readonly reproduce: typeof InternalProperty.reproduce = InternalProperty.reproduce,
  ) {}

  configure(config: PropertyConfig): Property<Values> {
    return new Property<Values>(this.gens, this.f, config, this.explore, this.reproduce);
  }

  run(seed: number, size: number): Iterable<PropertyResult<Values>> {
    const internalGens = this.gens.map((gen) => gen.genFunction) as GenFunctions<Values>;
    const internalSeed = Core.Seed.create(seed);

    return this.config.counterexamplePath === undefined
      ? handleExplore(this.explore, internalGens, this.f, internalSeed, size)
      : handleReproduce(this.reproduce, internalGens, this.f, internalSeed, size, this.config.counterexamplePath);
  }
}

export type PropertyFunctionArgs<Values extends AnyValues> = [...Gens<Values>, PropertyFunction<Values>];

export const property = <Values extends AnyValues>(...args: PropertyFunctionArgs<Values>): Property<Values> => {
  // TODO: Validation
  const gens = args.slice(0, args.length - 1) as Gens<Values>;
  const f = args[args.length - 1] as PropertyFunction<Values>;
  return new Property<Values>(gens, f);
};
