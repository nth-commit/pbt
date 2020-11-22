import { GenTree } from '../GenTree';
import { Gen as G, GenFactory, ArrayGen, IntegerGen, ElementGen } from './Abstractions';
import { array, integer, element } from './Gens';
import { GenImpl } from './Gens/GenImpl';
import { RawGenImpl } from './Gens/RawGenImpl';
import { GenStreamer, GenStreamerTransformation, StatefulGenFunction } from './GenStream';
import { Shrink } from './Shrink';

const genFactory: GenFactory = {
  integer: () => integer(genFactory),
  array: (elementGen) => array(elementGen, genFactory),
  element: (collection) => element(collection, genFactory),
};

export type Gen<T> = G<T>;

export type Gens<Ts extends any[]> = { [P in keyof Ts]: Gen<Ts[P]> };

export namespace Gen {
  /**
   * Creates a generator from a series of functions.
   *
   * @param statefulGenFunction
   * @param shrink
   * @param calculateComplexity
   */
  export const create = <T>(
    statefulGenFunction: StatefulGenFunction<T>,
    shrink: Shrink<T>,
    calculateComplexity: GenTree.CalculateComplexity<T> = GenTree.CalculateComplexity.none(),
  ): Gen<T> =>
    new GenImpl(
      () => GenStreamer.create(statefulGenFunction, shrink, calculateComplexity),
      GenStreamerTransformation.repeat(),
      genFactory,
    );

  /**
   * Creates a generator that always returns the given value, and does not shrink.
   *
   * @param x
   */
  export const constant = <T>(x: T): Gen<T> => create(() => x, Shrink.none());

  /**
   * Creates a generator that produces a single error signal, then terminates. This is the recommended way to exit from
   * functions that produce generators if the arguments were invalid, as the error signal will be appropriately
   * handled by the runners.
   *
   * @param message
   */
  /* istanbul ignore next */
  export const error = <T>(message: string): Gen<T> => new RawGenImpl(() => GenStreamer.error<T>(message), genFactory);

  /**
   * Creates a generator for integers.
   */
  export const integer = (): IntegerGen => genFactory.integer();

  /**
   * Creates a generator for arrays, where the elements of the array are values from the given generator.
   *
   * @param elementGen
   */
  export const array = <T>(elementGen: Gen<T>): ArrayGen<T> => genFactory.array(elementGen);

  /**
   * Creates a generator for tuples, where the elements of the tuple are values from the given generators, and are
   * placed in the resultant tuple position-wise.
   *
   * @param gens
   */
  export const zip = <Ts extends any[]>(...gens: Gens<Ts>): Gen<Ts> => {
    switch (gens.length) {
      case 0: {
        return constant(([] as unknown) as Ts);
      }
      case 1: {
        const [gen] = gens;
        return gen.map((x) => [x] as Ts);
      }
      default: {
        const [gen, ...nextGens] = gens;
        return gen.flatMap((x) => zip(...nextGens).map((xs) => [x, ...xs] as Ts));
      }
    }
  };

  export type VariadicMapper<Ts extends any[], U> = (...xs: { [P in keyof Ts]: Ts[P] }) => U;

  /**
   * Creates a generator, where the values of the given generators are provided as arguments for the mapper function,
   * and the results of the mapper function become the values for the resultant generator.
   *
   * @example Gen2.map(Gen2.constant('Hello'), Gen2.constant('World'), (greeting, subject) => `${greeting}, ${subject}`);
   *
   * @param args
   */
  export const map = <Ts extends any[], U>(...args: [...Gens<Ts>, VariadicMapper<Ts, U>]): Gen<U> => {
    const [f, ...gens] = args.reverse();
    const fUnsafe = f as VariadicMapper<any[], U>;
    const gensUnsafe = gens as Gens<any[]>;
    return zip(...gensUnsafe).map(([...xs]) => fUnsafe(...xs));
  };

  /**
   * Creates a generator, where the values of the resultant generator are a random element from the input collection.
   *
   * @param collection
   */
  export const element = <T>(collection: ElementGen.Collection<T>): ElementGen<T> => genFactory.element(collection);
}
