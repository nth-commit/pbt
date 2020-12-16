import { OperatorFunction } from 'ix/interfaces';
import { pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Size } from '../Core';
import { GenTree } from '../GenTree';
import { Rng, Range, Calculator, Natural, nativeCalculator } from '../Number';
import { GenIteration } from './GenIteration';
import { GenConfig, GenRunnable, GenStream } from './GenRunnable';
import { Shrink } from './Shrink';

export type GenTransformation<TInit, TCurr> = (g: GenRunnable<TInit>) => GenRunnable<TCurr>;

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

  export const collect = <T>(range: Range<number>, shrink: Shrink<GenTree<T>[]>): GenTransformation<T, T[]> => (
    gen0,
  ) => {
    const calculator = nativeCalculator;

    const transform0 = GenTransformation.repeat<T[]>();

    const transform1: GenTransformation<T, T[]> = (gen1) => ({
      run: (rng, size, config) => {
        const length = calculator.loadNaturalUnchecked(
          rng.value(calculator, ...range.getSizedBounds(calculator.loadIntegerUnchecked(size))),
        );
        if (calculator.equals(length, calculator.zero)) {
          return collectNone<T>(rng, size);
        } else {
          return collectLength<T>(calculator, gen1, rng, size, config, shrink, length, range);
        }
      },
    });

    return transform0(transform1(gen0));
  };

  const collectNone = <T>(lengthRng: Rng, size: Size): GenStream<T[]> => [
    GenIteration.instance(GenTree.singleton([]), lengthRng, lengthRng.next(), size, size),
  ];

  const collectLength = function* <T>(
    calculator: Calculator<number>,
    gen: GenRunnable<T>,
    lengthRng: Rng,
    size: Size,
    config: GenConfig,
    shrinker: Shrink<GenTree<T>[]>,
    length: Natural<number>,
    range: Range<number>,
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
      if (calculator.greaterThanEquals(calculator.loadNaturalUnchecked(instances.length), length)) break;
    }

    const lastInstance = instances[instances.length - 1];
    const forest = instances.map((r) => r.tree);
    const getProportionalDistance = (n: number) => range.getProportionalDistance(calculator.loadNaturalUnchecked(n));

    yield GenIteration.instance(
      GenTree.concat(forest, getProportionalDistance, shrinker),
      lengthRng,
      lastInstance.nextRng,
      size,
      lastInstance.nextSize,
    );
  };
}
