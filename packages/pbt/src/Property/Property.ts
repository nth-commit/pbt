/* istanbul ignore file */

import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { indexed, Seed, Size } from '../Core';
import { Gen, Gens, GenIteration } from '../Gen';
import { GenTree } from '../GenTree';
import { Property, PropertyConfig, PropertyFunction, PropertyIteration, ShrinkIteration } from './Abstractions';

export type PropertyArgs<Ts extends [any, ...any[]]> = [...Gens<Ts>, PropertyFunction<Ts>];

export function property(f: PropertyFunction<[]>): Property<[]>;
export function property<Ts extends [any, ...any[]]>(...args: PropertyArgs<Ts>): Property<Ts>;
export function property<Ts extends [any, ...any[]]>(...args: PropertyArgs<Ts>): Property<Ts> {
  const [f, ...gens] = args.reverse();
  return new PropertyImpl(f as PropertyFunction<Ts>, gens.reverse() as Gens<Ts>);
}

class PropertyImpl<Ts extends any[]> implements Property<Ts> {
  constructor(private readonly f: PropertyFunction<Ts>, private readonly gens: Gens<Ts>) {}

  run(seed: number | Seed, size: Size, config: Partial<PropertyConfig> = {}): Iterable<PropertyIteration<Ts>> {
    const seed0 = typeof seed === 'number' ? Seed.create(seed) : seed;
    const gen = Gen.zip<Ts>(...this.gens);

    return config.path === undefined
      ? explore(this.f, gen, seed0, size)
      : repeat(this.f, gen, seed0, size, config.path);
  }
}

const explore = function* <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  gen: Gen<Ts>,
  seed: Seed,
  size: Size,
): Iterable<PropertyIteration<Ts>> {
  let iteration: PropertyIteration<Ts> | null = null;

  while (iteration === null || iteration.kind === 'pass') {
    const [leftSeed, rightSeed] = seed.split();

    for (const genIteration of gen.run(rightSeed, size)) {
      iteration = mapGenIterationToPropertyIteration(f, genIteration as GenIteration<any>);

      yield iteration;

      if (iteration.kind !== 'discard') {
        break;
      }
    }

    size = Size.increment(size);
    seed = leftSeed;
  }
};

const mapGenIterationToPropertyIteration = <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  genIteration: GenIteration<Ts>,
): PropertyIteration<Ts> => {
  switch (genIteration.kind) {
    case 'instance': {
      const { node, shrinks } = genIteration.tree;
      const fResult = PropertyFunction.invoke(f, node.value);
      switch (fResult.kind) {
        case 'success':
          return {
            kind: 'pass',
            seed: genIteration.seed,
            size: genIteration.size,
          };
        case 'failure':
          return {
            kind: 'fail',
            counterexample: {
              value: node.value,
              complexity: node.complexity,
              path: '',
              reason: fResult.reason,
            },
            shrinks: exploreForest(f, shrinks),
            seed: genIteration.seed,
            size: genIteration.size,
          };
      }
    }
    case 'discard':
      return {
        kind: 'discard',
        predicate: genIteration.predicate,
        value: genIteration.value,
        seed: genIteration.seed,
        size: genIteration.size,
      };
    case 'error':
      return {
        kind: 'error',
        message: genIteration.message,
        seed: genIteration.seed,
        size: genIteration.size,
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
              path: treeShrink.counterexample.path
                ? index.toString() + ':' + treeShrink.counterexample.path
                : index.toString(),
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
        path: '',
        value: tree.node.value,
        complexity: tree.node.complexity,
        reason: fResult.reason,
      },
    };

    yield shrinkIteration;

    yield* exploreForest(f, tree.shrinks);
  }
};

const repeat = function* <Ts extends any[]>(
  f: PropertyFunction<Ts>,
  gen: Gen<Ts>,
  seed: Seed,
  size: Size,
  path: string,
): Iterable<PropertyIteration<Ts>> {
  for (const genIteration of gen.run(seed, size)) {
    if (genIteration.kind === 'discard' || genIteration.kind === 'error') {
      yield genIteration;
    } else {
      const pathComponents = path === '' ? [] : path.split(':').map((x) => Number(x) + 1);
      const shrunkTree = GenTree.navigate(genIteration.tree, pathComponents);
      if (shrunkTree === null) {
        throw new Error('Invalid shrink path: ' + path);
      }

      const fResult = PropertyFunction.invoke(f, shrunkTree.node.value);
      if (fResult.kind === 'failure') {
        yield {
          kind: 'fail',
          seed: genIteration.seed,
          size: genIteration.size,
          counterexample: {
            path,
            reason: fResult.reason,
            ...shrunkTree.node,
          },
          shrinks: [],
        };
      } else {
        yield {
          kind: 'pass',
          seed: genIteration.seed,
          size: genIteration.size,
        };
      }

      break;
    }
  }
};
