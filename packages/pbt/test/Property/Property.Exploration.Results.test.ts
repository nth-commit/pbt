import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as devGen from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';
import * as gens from './Helpers/gens';

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

test('Given the gens are poisoned with an exhausted gen, the property is exhausted', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().chain((gens) => domainGen.shuffle([...gens, devGen.exhausted()])),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const property = dev.explore<unknown[]>(gens, f);

        const iterations = propertyRunner.iterate(property, runParams);

        const expectedIteration: Partial<dev.PropertyIteration<unknown[]>> = {
          kind: 'exhaustion',
        };
        expect(iterations.length).toEqual(1);
        expect(iterations[0]).toMatchObject(expectedIteration);
      },
    ),
  );
});

test('Given the gens are poisoned with a discarding gen, the property only returns discards', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      fc.tuple(domainGen.gens(), domainGen.discardingGen()).chain(([gens, gen]) => domainGen.shuffle([...gens, gen])),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const property = dev.explore<unknown[]>(gens, f);

        const iterations = propertyRunner.iterate(property, runParams);

        for (const iteration of iterations) {
          const expectedIteration: Partial<dev.PropertyIteration<unknown[]>> = {
            kind: 'discard',
          };
          expect(iteration).toMatchObject(expectedIteration);
        }
      },
    ),
  );
});

test('Given gens that discard at a rate of 50%, it is feasible for the property to return a success in 100 iterations', () => {
  // There's probably a way to test this statistically, but I don't know what that is... A naive property
  // implementation might run all the gens until they all happen to not discard, with up to 10 gens the chance of
  // pulling that off would be 0.5 ^ 10 = 1 / 1024. It's better to run each gen until an instance is realized, and then
  // run the next, iteratively collecting the instances without ever throwing one away.

  const genPossiblyDiscardingGens = fc.array(fc.constant(gens.possiblyDiscardingGen('50%')), 0, 10);

  fc.assert(
    fc.property(domainGen.runParams(), genPossiblyDiscardingGens, domainGen.infallibleFunc(), (runParams, gens, f) => {
      const property = dev.explore<unknown[]>(gens, f);

      const iterations = propertyRunner.iterate(property, { ...runParams, iterations: 100 });

      expect(iterations.map((iteration) => iteration.kind)).toContain('success');
    }),
  );
});
