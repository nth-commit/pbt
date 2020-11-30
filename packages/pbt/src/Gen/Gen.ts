import { GenTree } from '../GenTree';
import { Gen as G, GenFactory, ArrayGen, IntegerGen, ElementGen, StateMachineGen, PrimitiveGen } from './Abstractions';
import { GenIteration } from './GenIteration';
import { array, integer, element, primitive, stateMachine } from './Gens';
import { RawGenImpl } from './Gens/RawGenImpl';
import { Shrink } from './Shrink';

const genFactory: GenFactory = {
  primitive: (generate, shrink, measure) => primitive(generate, shrink, measure, genFactory),
  constant: (value) => genFactory.primitive(() => value, Shrink.none(), GenTree.CalculateComplexity.none()),
  error: (message: string) =>
    RawGenImpl.fromRunFunction((rng, size) => [GenIteration.error(message, rng, rng, size, size)], genFactory),
  integer: () => integer(genFactory),
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
