import { OperatorFunction } from 'ix/interfaces';
import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Rng, Size } from '../../Core';
import { GenTree } from '../../GenTree';
import { GenConfig, GenLite, GenStream } from '../Abstractions';
import { GenIteration } from '../GenIteration';
import { Range } from '../Range';
import { Shrink } from '../Shrink';

export type GenTransformation<TInit, TCurr> = (g: GenLite<TInit>) => GenLite<TCurr>;

export namespace GenTransformation {
  export const none = <T>(): GenTransformation<T, T> => (x) => x;

  export const repeat = <T>(): GenTransformation<T, T> => (gen) => ({
    run: function* (rng, size, config) {
      do {
        const stream = gen.run(rng, size, config);
        for (const iteration of stream) {
          yield iteration;
          rng = iteration.nextRng;
          size = iteration.nextSize;
        }
      } while (true);
    },
  });

  export const transformStream = <T, U>(f: (stream: GenStream<T>) => GenStream<U>): GenTransformation<T, U> => (
    gen,
  ) => ({
    run: (rng, size, config) => f(gen.run(rng, size, config)),
  });

  export const pipeStream = <T, U>(op: OperatorFunction<GenIteration<T>, GenIteration<U>>): GenTransformation<T, U> => {
    const f = (stream: GenStream<T>): GenStream<U> => pipe(stream, op);
    return transformStream(f);
  };

  export const mapInstancesOfStream = <T, U>(
    mapper: (instance: GenIteration.Instance<T>) => GenIteration<U>,
  ): GenTransformation<T, U> =>
    pipeStream(
      map((iteration) => {
        /* istanbul ignore next */
        if (iteration.kind !== 'instance') return iteration;
        return mapper(iteration);
      }),
    );

  export const mapTreesOfStream = <T, U>(f: (tree: GenTree<T>) => GenTree<U>): GenTransformation<T, U> =>
    mapInstancesOfStream((instance) => ({
      ...instance,
      tree: f(instance.tree),
    }));

  export const collect = <T>(range: Range, shrink: Shrink<GenTree<T>[]>): GenTransformation<T, T[]> => (gen0) => {
    const transform0 = GenTransformation.repeat<T[]>();

    const transform1: GenTransformation<T, T[]> = (gen1) => ({
      run: (rng, size, config) => {
        const length = rng.value(...range.getSizedBounds(size));
        if (length === 0) {
          return collectNone<T>(rng, size);
        } else {
          return collectLength<T>(gen1, rng, size, config, shrink, length, range);
        }
      },
    });

    return transform0(transform1(gen0));
  };

  const collectNone = <T>(lengthRng: Rng, size: Size): GenStream<T[]> => [
    GenIteration.instance(GenTree.singleton([]), lengthRng, lengthRng.next(), size, size),
  ];

  const collectLength = function* <T>(
    gen: GenLite<T>,
    lengthRng: Rng,
    size: Size,
    config: GenConfig,
    shrinker: Shrink<GenTree<T>[]>,
    length: number,
    range: Range,
  ): GenStream<T[]> {
    const initRng = lengthRng.next();

    let instances: GenIteration.Instance<T>[] = [];

    const stream = gen.run(initRng, size, config);

    for (const iteration of stream) {
      /* istanbul ignore next */
      if (iteration.kind !== 'instance') {
        yield iteration;
        continue;
      }

      instances = [...instances, iteration];
      if (instances.length >= length) break;
    }

    const lastInstance = instances[instances.length - 1];
    const forest = instances.map((r) => r.tree);
    yield GenIteration.instance(
      GenTree.concat(forest, range.getProportionalDistance, shrinker),
      lengthRng,
      lastInstance.nextRng,
      size,
      lastInstance.nextSize,
    );
  };
}
