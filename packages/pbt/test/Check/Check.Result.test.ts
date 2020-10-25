import fc from 'fast-check';
import * as domainGen from './Helpers/domainGen';
import * as dev from './srcShim';

test('Given an infallible property function, it returns success', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.infallibleFunc(), (runParams, gens, f) => {
      const result = dev.check(dev.explore<unknown[]>(gens, f), runParams);

      const expectedResult: dev.CheckResult<unknown[]> = {
        kind: 'success',
        iterations: runParams.iterations,
        discards: 0,
        seed: expect.anything(),
        size: expect.anything(),
      };
      expect(result).toMatchObject(expectedResult);
    }),
  );
});
