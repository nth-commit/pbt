import { GenTree } from '../GenTree';
import {
  Gen as G,
  GenFactory,
  ArrayGen,
  IntegerGen,
  ElementGen,
  StateMachineGen,
  PrimitiveGen,
  FloatGen,
} from './Abstractions';
import { GenIteration } from './GenIteration';
import { array, integer, element, primitive, stateMachine, float } from './Gens';
import { RawGenImpl } from './Gens/RawGenImpl';
import { Shrink } from './Shrink';

const genFactory: GenFactory = {
  primitive: (generate, shrink, measure) => primitive(generate, shrink, measure, genFactory),
  constant: (value) => genFactory.primitive(() => value, Shrink.none(), GenTree.CalculateComplexity.none()),
  error: (message: string) =>
    RawGenImpl.fromRunFunction((rng, size) => [GenIteration.error(message, rng, rng, size, size)], genFactory),
  integer: () => integer(genFactory),
  float: () => float(genFactory),
  array: (elementGen) => array(elementGen, genFactory),
  element: (collection) => element(collection, genFactory),
  stateMachine: (initialState, generateTransition, applyTransition) =>
    stateMachine(genFactory, initialState, generateTransition, applyTransition),
};

export type Gen<T> = G<T>;

export type Gens<Ts extends any[]> = { [P in keyof Ts]: Gen<Ts[P]> };

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
  ): Gen<T> => genFactory.primitive(generate, shrink, measure);

  /**
   * Creates a generator that always returns the given value, and does not shrink.
   *
   * @param value
   */
  export const constant = <T>(value: T): Gen<T> => genFactory.constant(value);

  /**
   * Creates a generator that produces a single error signal, then terminates. This is the recommended way to exit from
   * functions that produce generators if the arguments were invalid, as the error signal will be appropriately
   * handled by the runners.
   *
   * @param message
   */
  /* istanbul ignore next */
  export const error = <T>(message: string): Gen<T> => genFactory.error(message);

  /**
   * Creates a generator for integers.
   */
  export const integer = (): IntegerGen => genFactory.integer();

  /**
   * Creates a generator for floats.
   */
  export const float = (): FloatGen => genFactory.float();

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
  export const element = <T>(collection: ElementGen.Collection<T>): ElementGen<T> => genFactory.element(collection);

  export type GenerateTransitionFunction<State, Transition> = StateMachineGen.GenerateTransitionFunction<
    State,
    Transition
  >;

  export type ApplyTransitionFunction<State, Transition> = StateMachineGen.ApplyTransitionFunction<State, Transition>;

  /**
   * Creates a generator, where the values are states of a finite state machine. The state machine is defined by two
   * functions, the first produces
   * @param initialState
   * @param generateTransition
   * @param applyTransition
   */
  export const stateMachine = <State, Transition>(
    initialState: State,
    generateTransition: GenerateTransitionFunction<State, Transition>,
    applyTransition: ApplyTransitionFunction<State, Transition>,
  ): StateMachineGen<State> => genFactory.stateMachine(initialState, generateTransition, applyTransition);
}
