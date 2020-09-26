import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';
import * as compare from './Helpers/compare';

test("It's iterations are repeatible", () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.fallibleFunc(), (runParams, gens, f) => {
      const property = dev.explore<unknown[]>(gens, f);

      runParams.iterations = 1;
      const iterations = propertyRunner.iterate(property, runParams);

      for (const iteration of iterations) {
        const iterationRepeated = propertyRunner.iterate(property, {
          ...runParams,
          seed: iteration.seed,
          size: iteration.size,
          iterations: 1,
        })[0];

        expect(compare.propertyIteration(iterationRepeated)).toEqual(compare.propertyIteration(iteration));
      }
    }),
  );
});
