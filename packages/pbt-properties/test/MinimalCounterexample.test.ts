import * as stable from './helpers/stableApi';
import * as devGen from 'pbt-gen';
import * as dev from '../src';
import { arbitrarySeed, arbitrarySize } from './helpers/arbitraries';

const failwith = (str: string): void => {
  throw new Error(str);
};

test('It finds the minimal counterexample for a contrived numeric property of 1-arity', () => {
  stable.assert(
    stable.property(arbitrarySeed(), arbitrarySize(), (seed, size) => {
      const g = devGen.integer.linear(0, 100);
      const f = (a: number): boolean => a < 10;
      const p = dev.property(g, f);

      const result = p({ seed, size, iterations: 100 });

      if (result.kind !== 'failure') return failwith('Expected property.kind to equal "failure"');
      if (result.problem.kind !== 'predicate') return failwith('Expected problem.kind to equal "predicate"');

      const minimalCounterexample: [number] = result.problem.minimalCounterexample;
      expect(minimalCounterexample).toEqual([10]);
    }),
  );
});
