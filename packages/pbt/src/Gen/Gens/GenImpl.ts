import { pipe as pipeIter, concat as concatIter } from 'ix/iterable';
import {
  map as mapIter,
  filter as filterIter,
  flatMap as flatMapIter,
  take as takeIter,
  skip as skipIter,
} from 'ix/iterable/operators';
import { Size, takeWhileInclusive as takeWhileInclusiveIter } from '../../Core';
import { GenTree } from '../../GenTree';
import { NodeId } from '../../GenTree/NodeId';
import { Rng } from '../../Number';
import { Gen } from '../Gen';
import { GenIteration } from '../GenIteration';
import { GenConfig, GenRunnable, GenStream } from '../GenRunnable';
import { GenTransformation } from '../GenTransformation';
import { ArrayGen } from './ArrayGen';

export class GenImpl<TInit, TCurr> implements Gen<TCurr> {
  constructor(
    private readonly gen: GenRunnable<TInit>,
    private readonly transformation: GenTransformation<TInit, TCurr>,
  ) {}

  array(): ArrayGen<TCurr> {
    return Gen.array(this);
  }

  map<TNext>(mapper: (x: TCurr) => TNext): Gen<TNext> {
    return this.transform(GenTransformation.mapTreesOfStream((tree) => GenTree.map(tree, (x) => mapper(x))));
  }

  flatMap<TNext>(mapper: (x: TCurr) => Gen<TNext>): Gen<TNext> {
    return this.transform(flatMapGenTransformation(mapper));
  }

  filter(predicate: (x: TCurr) => boolean): Gen<TCurr> {
    return this.transform(filterGenTransformation(predicate));
  }

  noShrink(): Gen<TCurr> {
    return this.transform(GenTransformation.mapTreesOfStream((tree) => GenTree.singleton(tree.node.value)));
  }

  run(rng: Rng, size: number, config: GenConfig): GenStream<TCurr> {
    const gen = this.transformation(this.gen);
    return gen.run(rng, size, config);
  }

  private transform<TNext>(transformation: GenTransformation<TCurr, TNext>): Gen<TNext> {
    const nextTransformation: GenTransformation<TInit, TNext> = (gen) => transformation(this.transformation(gen));
    return new GenImpl<TInit, TNext>(this.gen, nextTransformation);
  }
}

const filterGenTransformation = <T>(predicate: (x: T) => boolean): GenTransformation<T, T> => (gen) => {
  const transform0 = GenTransformation.repeat<T>();

  const transform1 = GenTransformation.transformStream<T, T>(function* (stream) {
    let consecutiveDiscards = 0;
    for (const iteration of stream) {
      if (iteration.kind !== 'discard') {
        consecutiveDiscards = 0;
        yield iteration;
        continue;
      }

      consecutiveDiscards++;
      if (consecutiveDiscards >= 10) {
        consecutiveDiscards = 0;
        yield {
          ...iteration,
          nextSize: Math.min(iteration.nextSize + 10, 99),
        };
        break;
      }

      yield iteration;
    }
  });

  const transform2 = GenTransformation.mapInstancesOfStream<T, T>((instance) => {
    const { node, shrinks } = instance.tree;
    if (predicate(node.value)) {
      return GenIteration.instance(
        GenTree.create(
          node,
          GenTree.filterForest(shrinks, (x) => predicate(x)),
        ),
        instance.initRng,
        instance.nextRng,
        instance.initSize,
        instance.nextSize,
      );
    } else {
      return GenIteration.discard(
        node.value,
        predicate,
        instance.initRng,
        instance.nextRng,
        instance.initSize,
        instance.nextSize,
      );
    }
  });

  return transform0(transform1(transform2(gen)));
};

const flatMapGenTransformation = <T, U>(mapper: (x: T) => Gen<U>): GenTransformation<T, U> => (gen) => ({
  run: function* (rng, size, config) {
    const stream = gen.run(rng, size, config);
    for (const iteration of stream) {
      if (iteration.kind !== 'instance') {
        yield iteration;
        continue;
      }

      const innerStream = flatMapTreeToIterations(iteration.tree, mapper, iteration.nextRng, size, config);
      for (const innerIteration of innerStream) {
        const innerIterationMutated: GenIteration<U> = {
          ...innerIteration,
          initRng: rng,
          initSize: size,
        };

        yield innerIterationMutated;
      }
    }
  },
});

const flatMapTreeToIterations = <T, U>(
  leftTree: GenTree<T>,
  mapper: (x: T) => Gen<U>,
  rng: Rng,
  size: Size,
  config: GenConfig,
): GenStream<U> => {
  const gen = mapper(leftTree.node.value);

  return pipeIter(
    gen.run(rng, size, config),
    takeWhileInclusiveIter(GenIteration.isNotInstance),
    mapIter((iteration) => {
      if (GenIteration.isNotInstance(iteration)) return iteration;

      const rightTree = GenTree.mapNode(iteration.tree, (node) => ({
        id: NodeId.join(leftTree.node.id, node.id),
        value: node.value,
        complexity: leftTree.node.complexity + node.complexity,
      }));

      const leftShrinkFlatMapped = pipeIter(
        leftTree.shrinks,
        flatMapIter(function* (leftTreeShrink): Iterable<GenTree<U>> {
          for (const leftTreeShrinkIteration of flatMapTreeToIterations(leftTreeShrink, mapper, rng, size, config)) {
            /* istanbul ignore else */
            if (leftTreeShrinkIteration.kind === 'instance') {
              yield leftTreeShrinkIteration.tree;

              yield* pipeIter(
                Rng.stream(rng),
                skipIter(1),
                takeIter(iteration.nextRng.order - leftTreeShrinkIteration.nextRng.order),
                flatMapIter((altRng) => flatMapTreeToIterations(leftTreeShrink, mapper, altRng, size, config)),
                filterIter(GenIteration.isInstance),
                mapIter((iteration) => iteration.tree),
              );
            }
          }
        }),
      );

      return {
        ...iteration,
        kind: 'instance',
        tree: GenTree.create(rightTree.node, concatIter(leftShrinkFlatMapped, rightTree.shrinks)),
      };
    }),
  );
};
