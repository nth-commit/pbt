import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';

test('Given an infallible property function, it returns a success for each iteration', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.infallibleFunc(), (runParams, gens, f) => {
      const property = dev.explore<unknown[]>(gens, f);

      const iterations = propertyRunner.iterate(property, runParams);

      expect(iterations.length).toEqual(runParams.iterations);
      for (const iteration of iterations) {
        expect(iteration.kind).toEqual('success');
      }
    }),
  );
});

test('Given a false property predicate, it is immediately falsified because of the false predicate, then terminates', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), (runParams, gens) => {
      const property = dev.explore<unknown[]>(gens, () => false);

      const iterations = propertyRunner.iterate(property, runParams);

      const expectedIteration: Partial<dev.PropertyIteration<unknown[]>> = {
        kind: 'falsification',
        reason: {
          kind: 'returnedFalse',
        },
      };
      expect(iterations.length).toEqual(1);
      expect(iterations[0]).toMatchObject(expectedIteration);
    }),
  );
});

test('Given a throwing property function, it is immediately falsified because of the thrown error, then terminates', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), fc.anything(), (runParams, gens, error) => {
      const property = dev.explore<unknown[]>(gens, () => {
        throw error;
      });

      const iterations = propertyRunner.iterate(property, runParams);

      const expectedIteration: Partial<dev.PropertyIteration<unknown[]>> = {
        kind: 'falsification',
        reason: {
          kind: 'threwError',
          error,
        },
      };
      expect(iterations.length).toEqual(1);
      expect(iterations[0]).toMatchObject(expectedIteration);
    }),
  );
});

test('Given a fallible property function, it is eventually falsified', () => {
  fc.assert(
    fc.property(
      domainGen.runParams().filter((x) => x.iterations >= 25), // Give the function a chance to fail
      domainGen.gens().filter((gens) => gens.length > 1), // Ensure the function has some entropy
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const property = dev.explore<unknown[]>(gens, f);

        const iterations = propertyRunner.iterate(property, runParams);

        const [lastIteration, ...beforeLastIterations] = iterations.reverse();

        const expectedFailureIteration: Partial<dev.PropertyIteration<unknown[]>> = {
          kind: 'falsification',
        };
        expect(lastIteration).toMatchObject(expectedFailureIteration);

        for (const iteration of beforeLastIterations) {
          expect(iteration.kind).toEqual('success');
        }
      },
    ),
  );
});
