/* istanbul ignore file */

import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { indexed, Rng, Size } from '../Core';
import { Gen, Gens, GenIteration } from '../Gen';
import { GenTree } from '../GenTree';
import { Property, PropertyConfig } from './Abstractions';
import { calculatePropertySizes } from './calculatePropertySizes';

export type PropertyArgs<Ts extends [any, ...any[]]> = [...Gens<Ts>, Property.PropertyFunction<Ts>];

export function property(f: Property.PropertyFunction<[]>): Property<[]>;
export function property<Ts extends [any, ...any[]]>(...args: PropertyArgs<Ts>): Property<Ts>;
export function property<Ts extends [any, ...any[]]>(...args: PropertyArgs<Ts>): Property<Ts> {
  const [f, ...gens] = args.reverse();
  return new PropertyImpl(f as Property.PropertyFunction<Ts>, gens.reverse() as Gens<Ts>);
}

class PropertyImpl<Ts extends any[]> implements Property<Ts> {
  constructor(private readonly f: Property.PropertyFunction<Ts>, private readonly gens: Gens<Ts>) {}

  run(seed: number, iterationCount: number, config: PropertyConfig = {}): Iterable<Property.PropertyIteration<Ts>> {
    const gen = Gen.zip<Ts>(...this.gens);
    return config.path === undefined
      ? explore(this.f, gen, seed, config.size, iterationCount)
      : repeat(this.f, gen, seed, config.size || 0, config.path);
  }
}

const explore = function* <Ts extends any[]>(
  f: Property.PropertyFunction<Ts>,
  gen: Gen<Ts>,
  seed: number,
  requestedSize: Size | undefined,
  iterationCount: number,
): Iterable<Property.PropertyIteration<Ts>> {
  for (const size of calculatePropertySizes(iterationCount, requestedSize)) {
    let hasSeenTerminator = false;

    const iterations = pipe(
      gen.run(Rng.create(seed), size, {}),
      map((iteration) => mapGenIterationToPropertyIteration(f, iteration)),
    );

    for (const iteration of iterations) {
      yield iteration;

      seed = iteration.nextRng.seed;

      if (iteration.kind === 'pass') {
        break;
      } else if (iteration.kind === 'discard') {
        continue;
      } else if (iteration.kind === 'fail' || iteration.kind === 'error') {
        hasSeenTerminator = true;
        break;
      } else {
        const n: never = iteration;
        throw new Error(`Fatal: Unexpected iteration ${JSON.stringify(n, null, 2)}`);
      }
    }

    if (hasSeenTerminator) {
      break;
    }
  }
};

const mapGenIterationToPropertyIteration = <Ts extends any[]>(
  f: Property.PropertyFunction<Ts>,
  genIteration: GenIteration<Ts>,
): Property.PropertyIteration<Ts> => {
  switch (genIteration.kind) {
    case 'instance': {
      const { node, shrinks } = genIteration.tree;
      const fResult = Property.PropertyFunction.invoke(f, node.value);
      switch (fResult.kind) {
        case 'success':
          return {
            kind: 'pass',
            initRng: genIteration.initRng,
            nextRng: genIteration.nextRng,
            initSize: genIteration.initSize,
            nextSize: genIteration.nextSize,
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
            initRng: genIteration.initRng,
            nextRng: genIteration.nextRng,
            initSize: genIteration.initSize,
            nextSize: genIteration.nextSize,
          };
      }
    }
    case 'discard':
    case 'error':
      return genIteration;
  }
};

const exploreForest = function* <Ts extends any[]>(
  f: Property.PropertyFunction<Ts>,
  forest: Iterable<GenTree<Ts>>,
): Iterable<Property.ShrinkIteration<Ts>> {
  for (const { value: tree, index } of pipe(forest, indexed())) {
    const appendCurrentIndex = (treeShrink: Property.ShrinkIteration<Ts>): Property.ShrinkIteration<Ts> => {
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
  f: Property.PropertyFunction<Ts>,
  tree: GenTree<Ts>,
): Iterable<Property.ShrinkIteration<Ts>> {
  const fResult = Property.PropertyFunction.invoke(f, tree.node.value);
  if (fResult.kind === 'success') {
    yield {
      kind: 'pass',
    };
  } else {
    const shrinkIteration: Property.ShrinkIteration<Ts> = {
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
  f: Property.PropertyFunction<Ts>,
  gen: Gen<Ts>,
  seed: number,
  size: Size,
  path: string,
): Iterable<Property.PropertyIteration<Ts>> {
  for (const genIteration of gen.run(Rng.create(seed), size, {})) {
    if (genIteration.kind === 'discard' || genIteration.kind === 'error') {
      yield genIteration;
    } else {
      const pathComponents = path === '' ? [] : path.split(':').map((x) => Number(x) + 1);
      const shrunkTree = GenTree.navigate(genIteration.tree, pathComponents);
      if (shrunkTree === null) {
        throw new Error('Invalid shrink path: ' + path);
      }

      const fResult = Property.PropertyFunction.invoke(f, shrunkTree.node.value);
      if (fResult.kind === 'failure') {
        yield {
          kind: 'fail',
          initRng: genIteration.initRng,
          nextRng: genIteration.nextRng,
          initSize: genIteration.initSize,
          nextSize: genIteration.nextSize,
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
          initRng: genIteration.initRng,
          nextRng: genIteration.nextRng,
          initSize: genIteration.initSize,
          nextSize: genIteration.nextSize,
        };
      }

      break;
    }
  }
};
