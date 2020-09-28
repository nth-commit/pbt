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

        const reproduction = dev.reproduce(unshrinkingGens, f, runParams.seed, runParams.size, shrinkPath);

        expect(reproduction.kind).toEqual('validationError');
      },
    ),
  );
});

test('Given an infallible property function, it is unfalsified', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.infallibleFunc(), (runParams, gens, f) => {
      const result = dev.reproduce(gens, f, runParams.seed, runParams.size, []);

      const expectedResult: dev.PropertyResult<unknown[]> = {
        kind: 'unfalsified',
        iterations: 1,
        discards: 0,
        seed: runParams.seed,
        size: runParams.size,
      };
      expect(result).toEqual(expectedResult);
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
        const property = dev.property<unknown[]>(gens, f);

        const initialFalsification = propertyRunner
          .iterate(property, { ...runParams, iterations: 100 })
          .find((result) => result.kind === 'falsified') as dev.PropertyResult.Falsified<unknown[]>;

        const reproducedFalsification = dev.reproduce(
          gens,
          f,
          initialFalsification.seed,
          initialFalsification.size,
          [],
        );

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
        const property = dev.property<unknown[]>(gens, f);

        const initialFalsification = propertyRunner.last(property, {
          ...runParams,
          iterations: 100,
        }) as dev.PropertyResult.Falsified<unknown[]>;

        const reproducedFalsification = dev.reproduce(
          gens,
          f,
          initialFalsification.seed,
          initialFalsification.size,
          initialFalsification.counterexamplePath,
        );

        const expectedFalsification: dev.PropertyResult.Falsified<unknown[]> = {
          ...initialFalsification,
          shrinkIterations: expect.anything(),
        };
        expect(expectedFalsification).toEqual(reproducedFalsification);
      },
    ),
  );
});
