import * as fc from 'fast-check';
import * as dev from '../../src/Public';
import * as domainGen from './Helpers/domainGen';
import * as spies from '../helpers/spies';
import * as PropertyResultHelpers from './Helpers/PropertyResultHelpers';

test('A property formed by a true predicate returns an unfalsified result', () => {
  fc.assert(
    fc.property(domainGen.seed(), (seed) => {
      const p = dev.property(() => true);

      const result = dev.check(p, { seed });

      const expectedResult: dev.PropertyResult<[]> = {
        kind: 'unfalsified',
        iterations: 100,
        discards: 0,
        seed: expect.anything(),
        size: expect.anything(),
      };
      expect(result).toEqual(expectedResult);
    }),
  );
});

test('A property formed by a false predicate returns a falsified result', () => {
  fc.assert(
    fc.property(domainGen.seed(), (seed) => {
      const p = dev.property(() => false);

      const result = dev.check(p, { seed });

      const expectedResult: dev.PropertyResult<[]> = {
        kind: 'falsified',
        iterations: 1,
        discards: 0,
        seed: expect.anything(),
        size: expect.anything(),
        counterexample: [],
        counterexamplePath: '',
        reason: { kind: 'returnedFalse' },
        shrinkIterations: expect.anything(),
      };
      expect(result).toEqual(expectedResult);
    }),
  );
});

test('A property failure can be reproduced in a single iteration', () => {
  fc.assert(
    fc.property(domainGen.seed(), domainGen.gens(), domainGen.fallibleFunc(), (seed, gens, f) => {
      const spiedF = spies.spyOn(f);
      const p0 = dev.property(...gens, spiedF);
      const result0 = PropertyResultHelpers.asFalsified(dev.check(p0, { seed }));

      spiedF.mockClear();
      const p1 = p0.configure({ counterexamplePath: result0.counterexamplePath });
      const result1 = PropertyResultHelpers.asFalsified(
        dev.check(p1, { seed: result0.seed, size: result0.size, counterexamplePath: result0.counterexamplePath }),
      );

      expect(result1.counterexample).toEqual(result0.counterexample);
      expect(spiedF).toBeCalledTimes(1);
    }),
  );
});
