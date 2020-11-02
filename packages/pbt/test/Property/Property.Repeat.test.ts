import fc from 'fast-check';
import * as dev from '../../src';
import * as domainGen from '../Helpers/domainGen';
import { spyOn } from '../Helpers/spies';
import { failwith } from '../Helpers/failwith';

it('returns the same result with the same config', () => {
  fc.assert(
    fc.property(domainGen.checkConfig(), domainGen.gens(), domainGen.fallibleFunc(), (config, gens, f) => {
      const checkResult0 = dev.check(dev.property(...gens, f), config);
      const checkResult1 = dev.check(dev.property(...gens, f), config);

      expect(checkResult0).toEqual(checkResult1);
    }),
  );
});

it('returns the same falsification when repeated with the resulting parameters', () => {
  fc.assert(
    fc.property(domainGen.checkConfig(), domainGen.gens(), domainGen.fallibleFunc(), (config, gens, f) => {
      const p = dev.property(...gens, f);

      const checkResult0 = dev.check(p, { ...config, iterations: 100 });
      if (checkResult0.kind !== 'falsified') return failwith('expected falsified');

      const checkResult1 = dev.check(p, {
        seed: checkResult0.seed,
        size: checkResult0.size,
        path: checkResult0.counterexample.path,
      });
      if (checkResult1.kind !== 'falsified') return failwith('expected falsified');

      expect(checkResult1.counterexample).toEqual(checkResult0.counterexample);
    }),
  );
});

it('only calls the property function once', () => {
  fc.assert(
    fc.property(domainGen.checkConfig(), domainGen.gens(), domainGen.fallibleFunc(), (config, gens, f) => {
      const checkResult0 = dev.check(dev.property(...gens, f), { ...config, iterations: 100 });

      if (checkResult0.kind !== 'falsified') return failwith('expected falsified');

      const spyF = spyOn(f);
      dev.check(dev.property(...gens, spyF), {
        seed: checkResult0.seed,
        size: checkResult0.size,
        path: checkResult0.counterexample.path,
      });

      expect(spyF).toBeCalledTimes(1);
    }),
  );
});
