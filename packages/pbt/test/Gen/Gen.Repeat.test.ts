import fc from 'fast-check';
import * as dev from '../../src';
import * as domainGen from '../Helpers/domainGen';

it('is repeatable', () => {
  fc.assert(
    fc.property(domainGen.sampleConfig(), domainGen.gen(), (config, gen) => {
      const config0 = { ...config, seed: config.seed, iterations: 1 };
      const sample0 = dev.sample(gen, config0);

      const config1 = { seed: sample0.seed, size: sample0.size, iterations: 1 };
      const sample1 = dev.sample(gen, config1);

      expect(sample1).toEqual(sample0);
    }),
  );
});
