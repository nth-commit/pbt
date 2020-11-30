import { StateMachineGen, GenFactory, Gen, GenLite } from '../Abstractions';
import { RawGenImpl } from './RawGenImpl';

export const stateMachine = <State, Transition>(
  genFactory: GenFactory,
  initialState: State,
  generateTransition: StateMachineGen.GenerateTransitionFunction<State, Transition>,
  applyTransition: StateMachineGen.ApplyTransitionFunction<State, Transition>,
): StateMachineGen<State> =>
  new RawGenImpl<State[]>(stateMachineGen(genFactory, initialState, generateTransition, applyTransition), genFactory);

const stateMachineGen = <State, Transition>(
  genFactory: GenFactory,
  initialState: State,
  generateTransition: StateMachineGen.GenerateTransitionFunction<State, Transition>,
  applyTransition: StateMachineGen.ApplyTransitionFunction<State, Transition>,
): GenLite<State[]> =>
  genFactory
    .integer()
    .between(0, 25)
    .flatMap((transitionCount) =>
      applyTransitionsRec(genFactory, generateTransition, applyTransition, [initialState], transitionCount),
    );

const applyTransitionsRec = <State, Transition>(
  genFactory: GenFactory,
  generateTransition: StateMachineGen.GenerateTransitionFunction<State, Transition>,
  applyTransition: StateMachineGen.ApplyTransitionFunction<State, Transition>,
  states: State[],
  transitionCount: number,
): Gen<State[]> => {
  if (transitionCount <= 0) {
    return genFactory.constant(states);
  }

  const fromState = states[states.length - 1];
  return generateTransition(fromState).flatMap((transition) => {
    const toState = applyTransition(fromState, transition);
    return applyTransitionsRec(
      genFactory,
      generateTransition,
      applyTransition,
      [...states, toState],
      transitionCount - 1,
    );
  });
};
