/* istanbul ignore file */

import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { indexed, Seed, Size } from '../Core';
import { Gen, Gens, GenIteration } from '../Gen2';
import { GenTree } from '../GenTree';
import { Property, PropertyFunction, PropertyIteration, ShrinkIteration } from './Abstractions';

export type PropertyArgs<Ts extends [any, ...any[]]> = [...Gens<Ts>, PropertyFunction<Ts>];

export function property(f: PropertyFunction<[]>): Property<[]>;
export function property<Ts extends [any, ...any[]]>(...args: PropertyArgs<Ts>): Property<Ts>;
export function property<Ts extends [any, ...any[]]>(...args: PropertyArgs<Ts>): Property<Ts> {
  const [f, ...gens] = args.reverse();
  return new PropertyImpl(f as PropertyFunction<Ts>, gens as Gens<Ts>);
}

class PropertyImpl<Ts extends any[]> implements Property<Ts> {
  constructor(public readonly f: PropertyFunction<Ts>, public readonly gens: Gens<Ts>) {}

  run(seed: number | Seed, size: Size): Iterable<PropertyIteration<Ts>> {
    return explore(this.f, this.gens, typeof seed === 'number' ? Seed.create(seed) : seed, size);
  }
}

const explore = function* <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  gens: Gens<Ts>,
  seed: Seed,
  size: Size,
): Iterable<PropertyIteration<Ts>> {
  const gen = Gen.zip(...gens);

  let iteration: PropertyIteration<Ts> = {
    kind: 'pass',
    seed,
    size,
  };

  while (iteration.kind === 'pass') {
    const [leftSeed, rightSeed] = seed.split();

    for (const genIteration of gen.run(rightSeed, size)) {
      iteration = mapGenIterationToPropertyIteration(f, genIteration as GenIteration<any>, rightSeed, size);

      yield iteration;

      if (iteration.kind !== 'discard') {
        break;
      }
    }

    size = Size.increment(size);
    seed = leftSeed;
  }
};

type OmitSeedAndSize<T extends { seed: Seed; size: Size }> = Omit<T, 'seed' | 'size'>;

const mapGenIterationToPropertyIteration = <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  genIteration: GenIteration<Ts>,
  seed: Seed,
  size: Size,
): PropertyIteration<Ts> => {
  const iteration = mapGenIterationToNonReplicablePropertyIteration(f, genIteration);
  switch (iteration.kind) {
    default:
      return {
        ...iteration,
        seed,
        size,
      };
  }
};

type NonReplicablePropertyIteration<Ts extends any[]> =
  | OmitSeedAndSize<PropertyIteration.Pass>
  | OmitSeedAndSize<PropertyIteration.Fail<Ts>>
  | OmitSeedAndSize<PropertyIteration.Discard>
  | OmitSeedAndSize<PropertyIteration.Error>;

const mapGenIterationToNonReplicablePropertyIteration = <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  genIteration: GenIteration<Ts>,
): NonReplicablePropertyIteration<Ts> => {
  switch (genIteration.kind) {
    case 'instance': {
      const { node, shrinks } = genIteration.tree;
      const fResult = PropertyFunction.invoke(f, node.value);
      switch (fResult.kind) {
        case 'success':
          return {
            kind: 'pass',
          };
        case 'failure':
          return {
            kind: 'fail',
            counterexample: {
              value: node.value,
              complexity: node.complexity,
              path: [],
              reason: fResult.reason,
            },
            shrinks: exploreForest(f, shrinks),
          };
      }
    }
    case 'discard':
      return {
        kind: 'discard',
        predicate: genIteration.filteringPredicate,
        value: genIteration.value,
      };
    case 'error':
      return {
        kind: 'error',
        message: genIteration.message,
      };
  }
};

const exploreForest = function* <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  forest: Iterable<GenTree<Ts>>,
): Iterable<ShrinkIteration<Ts>> {
  for (const { value: tree, index } of pipe(forest, indexed())) {
    const appendCurrentIndex = (treeShrink: ShrinkIteration<Ts>): ShrinkIteration<Ts> => {
      switch (treeShrink.kind) {
        case 'pass':
          return treeShrink;
        case 'fail':
          return {
            ...treeShrink,
            counterexample: {
              ...treeShrink.counterexample,
              path: [index, ...treeShrink.counterexample.path],
            },
          };
      }
    };

    let hasConfirmedCounterexample = false;

    for (const treeShrink of pipe(exploreTree(f, tree), map(appendCurrentIndex))) {
      yield treeShrink;

      if (treeShrink.kind === 'fail') {
        hasConfirmedCounterexample = true;
      }
    }

    if (hasConfirmedCounterexample) {
      break;
    }
  }
};

const exploreTree = function* <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  tree: GenTree<Ts>,
): Iterable<ShrinkIteration<Ts>> {
  const fResult = PropertyFunction.invoke(f, tree.node.value);
  if (fResult.kind === 'success') {
    yield {
      kind: 'pass',
    };
  } else {
    const shrinkIteration: ShrinkIteration<Ts> = {
      kind: 'fail',
      counterexample: {
        path: [],
        value: tree.node.value,
        complexity: tree.node.complexity,
        reason: fResult.reason,
      },
    };

    yield shrinkIteration;

    yield* exploreForest(f, tree.shrinks);
  }
};
