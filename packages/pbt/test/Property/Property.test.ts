import * as dev from '../../src';
import * as domainGen from '../Gen/Helpers/domainGen';
import fc from 'fast-check';

test('Given a succeeding property function, it returns unfalsified', () => {
  fc.assert(
    fc.property(domainGen.gens(), domainGen.passingFunc(), (gens, f) => {
      const checkResult = dev.check(dev.property(...gens, f));

      const expectedCheckResult: dev.CheckResult<[]> = {
        kind: 'unfalsified',
        iterations: expect.anything(),
        discards: expect.anything(),
      };
      expect(checkResult).toEqual(expectedCheckResult);
    }),
  );
});