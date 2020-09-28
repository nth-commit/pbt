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
      const property = dev.property<unknown[]>(gens, spyF);

      propertyRunner.iterate(property, {
        ...runParams,
        iterations: 1,
      });

      expect(spyF).toBeCalledWith(...genValues);
    }),
  );
});

test('It invokes the property function for each iteration and shrink', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.fallibleFunc(), (runParams, gens, f) => {
      const spyF = spies.spyOn(f);
      const property = dev.property<unknown[]>(gens, spyF);

      const lastIteration = propertyRunner.last(property, runParams);

      const expectedIterations =
        lastIteration.iterations + (lastIteration.kind === 'falsified' ? lastIteration.shrinkIterations : 0);
      expect(spyF).toBeCalledTimes(expectedIterations);
    }),
  );
});

test('For a fallible property, the arguments of the property function are the same as the counterexample returned in the result', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), (runParams, gens) => {
      const spyF = spies.spyOn(() => false);
      const property = dev.property<unknown[]>(gens, spyF);

      const falsification = propertyRunner
        .iterate(property, {
          ...runParams,
          iterations: 1,
        })
        .find((r) => r.kind === 'falsified') as dev.PropertyResult.Falsified<unknown[]>;

      const returnedOutcomes = falsification.counterexample;
      const spiedOutcomes = spyF.mock.calls[0];
      expect(returnedOutcomes).toEqual(spiedOutcomes);
    }),
  );
});
