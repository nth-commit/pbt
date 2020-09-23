import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as devGen from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';
import * as spies from '../helpers/spies';

test('It invokes the property function with a value from each gens', () => {
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

test('For a fallible property, the property function is invoked with the outcome of the tree returned in the result', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), (runParams, gens) => {
      const spyF = spies.spyOn(() => false);
      const property = dev.explore<unknown[]>(gens, spyF);

      const falsification = propertyRunner.findFalsification(property, {
        ...runParams,
        iterations: 1,
      });

      const returnedOutcomes = falsification.trees.map(dev.Tree.outcome);
      const spiedOutcomes = spyF.mock.calls[0];
      expect(returnedOutcomes).toEqual(spiedOutcomes);
    }),
  );
});
