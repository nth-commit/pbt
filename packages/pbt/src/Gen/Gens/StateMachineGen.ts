import { RawGenImpl } from './RawGenImpl';
import { Gen } from '../Gen';

export type StateMachineGen<State, Transition> = Gen<State[]>;

export const StateMachineGen = {
  create: <State, Transition>(
    initialState: State,
    generateTransition: (state: State) => Gen<Transition>,
    applyTransition: (state: State, transition: Transition) => State,
  ): StateMachineGen<State, Transition> =>
    new RawGenImpl<State[]>(stateMachineGen(initialState, generateTransition, applyTransition)),
};

const stateMachineGen = <State, Transition>(
  initialState: State,
  generateTransition: (state: State) => Gen<Transition>,
  applyTransition: (state: State, transition: Transition) => State,
): Gen<State[]> =>
  Gen.integer()
    .between(0, 25)
    .flatMap((transitionCount) =>
      applyTransitionsRec(generateTransition, applyTransition, [initialState], transitionCount),
    );

const applyTransitionsRec = <State, Transition>(
  generateTransition: (state: State) => Gen<Transition>,
  applyTransition: (state: State, transition: Transition) => State,
  states: State[],
  transitionCount: number,
): Gen<State[]> => {
  if (transitionCount <= 0) {
    return Gen.constant(states);
  }

  const fromState = states[states.length - 1];
  return generateTransition(fromState).flatMap((transition) => {
    const toState = applyTransition(fromState, transition);
    return applyTransitionsRec(generateTransition, applyTransition, [...states, toState], transitionCount - 1);
  });
};
