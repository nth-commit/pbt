import { GenTree } from '../GenTree';
import { GenIteration } from './GenIteration';
import { GenRunnable } from './GenRunnable';
import { ArrayGen } from './Gens/ArrayGen';
import { ElementGen } from './Gens/ElementGen';
import { FloatGen } from './Gens/FloatGen';
import { IntegerGen } from './Gens/IntegerGen';
import { PrimitiveGen } from './Gens/PrimitiveGen';
import { RawGenImpl } from './Gens/RawGenImpl';
import { StateMachineGen } from './Gens/StateMachineGen';
import { Shrink } from './Shrink';

export type Gens<Ts extends any[]> = { [P in keyof Ts]: Gen<Ts[P]> };

export type Gen<T> = GenRunnable<T> & {
  /**
   * Creates a new generator of type T[], using the source generator to generate the elements of the array.
   */
  array(): ArrayGen<T>;

  /**
   * Creates a new generator, where the instances of the source generator are transformed by a mapper function. The
   * generator calls the mapper function for each iteration of the source generator.
   *
   * @param mapper The mapper function.
   */
  map<U>(mapper: (x: T) => U): Gen<U>;

  /**
   * Creates a new generator, which is dependent on the instances of the source generator. The generator calls the
   * mapper function for each successful iteration of the source generator, and pipes those instances into the stream
   * of the resultant generator.
   *
   * @param mapper The mapper function.
   */
  flatMap<U>(mapper: (x: T) => Gen<U>): Gen<U>;

  /**
   * Creates a new generator, whose instances have been filtered by a predicate. The generator calls the predicate for
   * each iteration of the source generator.
   *
   * @param predicate
   */
  filter(predicate: (x: T) => boolean): Gen<T>;

  /**
   * Creates a new generator, whose instances do not shrink. Useful for creating generators for data that doesn't have
   * a natural order or size.
   */
  noShrink(): Gen<T>;
};

export namespace Gen {
  export type StatefulGenFunction<T> = PrimitiveGen.StatefulGenFunction<T>;
  export type NextIntFunction = PrimitiveGen.NextIntFunction;

  /**
   * Creates a generator from a series of functions.
   *
   * @param generate
   * @param shrink
   * @param measure
   */
  export const create = <T>(
    generate: StatefulGenFunction<T>,
    shrink: Shrink<T>,
    measure: GenTree.CalculateComplexity<T> = GenTree.CalculateComplexity.none(),
  ): Gen<T> => PrimitiveGen.create(generate, shrink, measure);

  /**
   * Creates a generator that always returns the given value, and does not shrink.
   *
   * @param value
   */
  export const constant = <T>(value: T): Gen<T> =>
    PrimitiveGen.create(() => value, Shrink.none(), GenTree.CalculateComplexity.none());

  /**
   * Creates a generator that produces a single error signal, then terminates. This is the recommended way to exit from
   * functions that produce generators if the arguments were invalid, as the error signal will be appropriately
   * handled by the runners.
   *
   * @param message
   */
  export const error = <T>(message: string): Gen<T> =>
    RawGenImpl.fromRunFunction((rng, size) => [GenIteration.error(message, rng, rng, size, size)]);

  export type Integer = IntegerGen;

  /**
   * Creates a generator for integers.
   */
  export const integer = (): IntegerGen => IntegerGen.create();

  export type Float = FloatGen;

  /**
   * Creates a generator for floats.
   */
  export const float = (): FloatGen => FloatGen.create();

  export type Array<T> = ArrayGen<T>;

  /**
   * Creates a generator for arrays, where the elements of the array are values from the given generator.
   *
   * @param elementGen
   */
  export const array = <T>(elementGen: Gen<T>): ArrayGen<T> => ArrayGen.create(elementGen);

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

  /**
   * @description Repeats values from a source generator into a tuple of length 2.
   *
   * @example Gen.two(Gen.integer()); // [0, 1], [5, 42], [-1, 1] ...
   *
   * @param gen The source generator
   */
  export const two = <T>(gen: Gen<T>): Gen<[T, T]> => zip(gen, gen);

  /**
   * @description Repeats values from a source generator into a tuple of length 3.
   *
   * @example Gen.three(Gen.integer()); // [0, 1, 2], [5, 42, 8], [-1, 1, 0] ...
   *
   * @param gen The source generator
   */
  export const three = <T>(gen: Gen<T>): Gen<[T, T, T]> => zip(gen, gen, gen);

  /**
   * @description Repeats values from a source generator into a tuple of length 4.
   *
   * @example Gen.four(Gen.integer()); // [0, 1, 2, 3], [5, 42, 8, -160], [-1, 1, 0, 11] ...
   *
   * @param gen The source generator
   */
  export const four = <T>(gen: Gen<T>): Gen<[T, T, T, T]> => zip(gen, gen, gen, gen);

  export type VariadicMapper<Ts extends any[], U> = (...xs: { [P in keyof Ts]: Ts[P] }) => U;

  /**
   * Creates a generator, where the values of the given generators are provided as arguments for the mapper function,
   * and the results of the mapper function become the values for the resultant generator.
   *
   * @example Gen.map(Gen.constant('Hello'), Gen.constant('World'), (greeting, subject) => `${greeting}, ${subject}`); // 'Hello, World' ...
   *
   * @param args
   */
  export const map = <Ts extends any[], U>(...args: [...Gens<Ts>, VariadicMapper<Ts, U>]): Gen<U> => {
    const gens = args.slice(0, args.length - 1) as Gens<Ts>;
    const mapper = args[args.length - 1] as VariadicMapper<Ts, U>;
    return zip<Ts>(...gens).map((xs) => mapper(...xs));
  };

  export type VariadicFlatMapper<Ts extends any[], U> = (...xs: { [P in keyof Ts]: Ts[P] }) => Gen<U>;

  /**
   * Creates a generator, where the values of the given generators are provided as arguments for the mapper function,
   * and the results of the mapper function become the values for the resultant generator.
   *
   * @param args
   */
  export const flatMap = <Ts extends any[], U>(...args: [...Gens<Ts>, VariadicFlatMapper<Ts, U>]): Gen<U> => {
    const gens = args.slice(0, args.length - 1) as Gens<Ts>;
    const mapper = args[args.length - 1] as VariadicFlatMapper<Ts, U>;
    return zip<Ts>(...gens).flatMap((xs) => mapper(...xs));
  };

  /**
   * Creates a generator, where the values of the resultant generator are a random element from the input collection.
   *
   * @param collection
   */
  export const element = <T>(collection: ElementGen.Collection<T>): ElementGen<T> => ElementGen.create(collection);

  export type StateMachine<State, Transition> = StateMachineGen<State, Transition>;

  /**
   * Creates a generator, where the values are states of a finite state machine. The state machine is defined by two
   * functions, the first produces
   * @param initialState
   * @param generateTransition
   * @param applyTransition
   */
  export const stateMachine = <State, Transition>(
    initialState: State,
    generateTransition: (state: State) => Gen<Transition>,
    applyTransition: (state: State, transition: Transition) => State,
  ): StateMachine<State, Transition> => StateMachineGen.create(initialState, generateTransition, applyTransition);
}
