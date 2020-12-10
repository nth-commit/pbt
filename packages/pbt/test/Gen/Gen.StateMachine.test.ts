import { Gen } from 'pbt';
import * as dev from '../../src';
import { expectGen, anyMinimum } from '../Helpers/expectGen';

const unaryState = Symbol('unaryState');
const allBinaryStates = ['0', '1'] as const;
const allTernaryStates = ['0', '1', '2'] as const;

type BinaryState = typeof allBinaryStates[number];
type TernaryState = typeof allTernaryStates[number];

test('Gen.stateMachine(s, ...,  ...), s = the unary state *shrinks to* [s]', () => {
  const generateTransition = () => dev.Gen.constant({});
  const applyTransition = () => unaryState;
  const gen = dev.Gen.stateMachine(unaryState, generateTransition, applyTransition);

  expectGen(gen).toHaveMinimum([unaryState], anyMinimum);
});

describe('about simple n-ary switches', () => {
  // A simple n-ary switch is a state machine that can transition from any state to any state, excluding the current state

  test.property(
    'Gen.stateMachine(s, f, g), [s, f, g] generate binary state machine *shrinks to* [s0, s1] *when* size(distinct states) = 2',
    Gen.element<BinaryState>(allBinaryStates),
    (initialState) => {
      const generateTransition = () => dev.Gen.constant({});
      const applyTransition = (state: BinaryState) => (state === '0' ? '1' : '0');

      const gen = dev.Gen.stateMachine(initialState, generateTransition, applyTransition);

      expectGen(gen).onMinimum(
        (states) => new Set(states).size === 2,
        (minimum) => {
          expect(minimum).toHaveLength(2);
          expect(new Set(minimum)).toEqual(new Set(allBinaryStates));
        },
      );
    },
  );

  test.skip.property(
    'Gen.stateMachine(s, f, g), [s, f, g] generate ternary state machine *shrinks to* [s0, s1, s2] *when* size(distinct states) = 3',
    Gen.element<TernaryState>(allTernaryStates),
    (initialState) => {
      const generateTransition = (state: TernaryState) => dev.Gen.element(allTernaryStates.filter((s) => s !== state));
      const applyTransition = (_: TernaryState, transition: TernaryState) => transition;

      const gen = dev.Gen.stateMachine(initialState, generateTransition, applyTransition);

      expectGen(gen).onMinimum(
        (states) => new Set(states).size === 3,
        (minimum) => {
          expect(minimum).toHaveLength(3);
          expect(new Set(minimum)).toEqual(new Set(allTernaryStates));
        },
        {
          ...{ seed: 3902822796, size: 13 },
        },
      );
    },
  );
});
