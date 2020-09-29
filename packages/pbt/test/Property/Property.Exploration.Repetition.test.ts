import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';

test("It's results are repeatible", () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.fallibleFunc(), (runParams, gens, f) => {
      const property = dev.explore<unknown[]>(gens, f);

      const results = propertyRunner
        .iterate(property, runParams)
        .filter((result) => result.kind !== 'falsified' || result.shrinkIterations === 0);

      for (const result of results) {
        const resultRepeated = propertyRunner.single(property, {
          ...runParams,
          seed: result.seed,
          size: result.size,
          iterations: 1,
        });

        expect(resultRepeated).toEqual(result);
      }
    }),
  );
});
