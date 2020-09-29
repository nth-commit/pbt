import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as devGen from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';

test('Given an invalid shrink path, it returns a validation error', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens(),
      domainGen.fallibleFunc(),
      fc.array(fc.integer(), 1, 10),
      (runParams, gens, f, shrinkPath) => {
        const unshrinkingGens = gens.map(devGen.noShrink); // No non-empty shrink path will be valid
        const property = dev.reproduce(unshrinkingGens, f, shrinkPath);

        const lastResult = propertyRunner.last(property, runParams);

        expect(lastResult.kind).toEqual('error');
      },
    ),
  );
});

test('Given an infallible property function, it is unfalsified', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.infallibleFunc(), (runParams, gens, f) => {
      const property = dev.reproduce(gens, f, []);

      const lastResult = propertyRunner.last(property, runParams);

      const expectedResult: dev.PropertyResult<unknown[]> = {
        kind: 'unfalsified',
        iterations: 1,
        discards: 0,
        seed: runParams.seed,
        size: runParams.size,
      };
      expect(lastResult).toEqual(expectedResult);
    }),
  );
});

test('Given a fallible property function, after an exploration, it can reproduce the non-shrunk result', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().filter((gens) => gens.length > 0),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const propertyExploration = dev.explore<unknown[]>(gens, f);

        const initialFalsification = propertyRunner
          .iterate(propertyExploration, { ...runParams, iterations: 100 })
          .find((result) => result.kind === 'falsified') as dev.PropertyResult.Falsified<unknown[]>;

        const propertyReproduction = dev.reproduce(gens, f, []);

        const reproducedFalsification = propertyRunner.last(propertyReproduction, {
          seed: initialFalsification.seed,
          size: initialFalsification.size,
          iterations: 1,
        });

        expect(initialFalsification).toEqual(reproducedFalsification);
      },
    ),
  );
});

test('Given a fallible property function, after an exploration and a shrink, it can reproduce the shrunk result', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().filter((gens) => gens.length > 0),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const propertyExploration = dev.explore<unknown[]>(gens, f);

        const initialFalsification = propertyRunner.last(propertyExploration, {
          ...runParams,
          iterations: 100,
        }) as dev.PropertyResult.Falsified<unknown[]>;

        const propertyReproduction = dev.reproduce(gens, f, initialFalsification.counterexamplePath);

        const reproducedFalsification = propertyRunner.last(propertyReproduction, {
          seed: initialFalsification.seed,
          size: initialFalsification.size,
          iterations: 1,
        });

        const expectedFalsification: dev.PropertyResult.Falsified<unknown[]> = {
          ...initialFalsification,
          shrinkIterations: expect.anything(),
        };
        expect(expectedFalsification).toEqual(reproducedFalsification);
      },
    ),
  );
});
