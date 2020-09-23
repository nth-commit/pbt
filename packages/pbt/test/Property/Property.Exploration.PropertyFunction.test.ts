import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as devGen from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';
import * as spies from '../helpers/spies';

test('For one iteration, it invokes the property function with a value from each gens', () => {
  fc.assert(
    fc.property(domainGen.runParams(), fc.array(fc.anything()), domainGen.fallibleFunc(), (runParams, genValues, f) => {
      const gens = genValues.map(devGen.constant);
      const spyF = spies.spyOn(f);
      const property = dev.explore<unknown[]>(gens, spyF);

      propertyRunner.iterate(property, {
        ...runParams,
        iterations: 1,
      });

      expect(spyF).toBeCalledWith(...genValues);
    }),
  );
});
