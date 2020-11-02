import * as dev from '../../src';
import * as domainGen from '../Helpers/domainGen';
import fc from 'fast-check';

test('Given a succeeding property function, it returns unfalsified', () => {
  fc.assert(
    fc.property(domainGen.checkConfig(), domainGen.gens(), domainGen.passingFunc(), (config, gens, f) => {
      const checkResult = dev.check(dev.property(...gens, f), config);

      const expectedCheckResult: dev.CheckResult<[]> = {
        kind: 'unfalsified',
        iterations: expect.anything(),
        discards: expect.anything(),
      };
      expect(checkResult).toEqual(expectedCheckResult);
    }),
  );
});
