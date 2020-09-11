import fc from 'fast-check';
import * as stable from './helpers/stableApi';
import * as devGen from 'pbt-gen';
import * as dev from '../src';
import { arbitrarySeed, arbitrarySize } from './helpers/arbitraries';
import { Property } from '../src';

const failwith = (str: string): void => {
  throw new Error(str);
};

test('Given a property that fails when a >= x, it returns [x] as the counterexample', () => {
  stable.assert(
    stable.property(arbitrarySeed(), arbitrarySize(), (seed, size) => {
      const x = 10;
      const g = devGen.integer.linear(0, 100);
      const f = (a: number): boolean => a < x;
      const p = dev.property(g, f);

      const result = p({ seed, size, iterations: 100 });

      if (result.kind !== 'failure') return failwith('Expected property.kind to equal "failure"');

      expect(result.counterexample).toEqual({
        values: [x],
        originalValues: expect.anything(),
        shrinkPath: expect.anything(),
      });
    }),
  );
});

const arrayRange = (startIndex: number, endIndex: number): number[] =>
  [...Array(endIndex).keys()].map((x) => x + startIndex);

test('Given a property that is only related to a, all other gens shrink to their smallest possible values', () => {
  stable.assert(
    stable.property(arbitrarySeed(), arbitrarySize(), fc.integer(1, 10), (seed, size, otherGenCount) => {
      const x = 10;
      const g = devGen.integer.linear(0, 100);
      const gs = [g, ...arrayRange(0, otherGenCount).map(() => g)];
      const f = (a: number, ..._: number[]): boolean => a < x;
      const p = (dev.property as any)(...gs, f) as Property<[]>;

      const result = p({ seed, size, iterations: 100 });

      if (result.kind !== 'failure') return failwith('Expected property.kind to equal "failure"');

      expect(result.counterexample).toEqual({
        values: [expect.anything(), ...arrayRange(0, otherGenCount).map(() => 0)],
        originalValues: expect.anything(),
        shrinkPath: expect.anything(),
      });
    }),
  );
});
