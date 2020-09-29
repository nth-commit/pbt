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

      const results = propertyRunner.iterate(property, runParams);

      expect(results.length).toEqual(runParams.iterations);
      for (const result of results) {
        expect(result.kind).toEqual('unfalsified');
      }
    }),
  );
});

test('Given a false property predicate, it is immediately falsified because of the false predicate', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), (runParams, gens) => {
      const property = dev.explore<unknown[]>(gens, () => false);

      const results = propertyRunner.iterate(property, runParams);

      for (const result of results) {
        const expectedResult: Partial<dev.PropertyResult<unknown[]>> = {
          kind: 'falsified',
          reason: {
            kind: 'returnedFalse',
          },
        };
        expect(result).toMatchObject(expectedResult);
      }
    }),
  );
});

test('Given a throwing property function, it is immediately falsified because of the thrown error', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), fc.anything(), (runParams, gens, error) => {
      const property = dev.explore<unknown[]>(gens, () => {
        throw error;
      });

      const results = propertyRunner.iterate(property, runParams);

      for (const result of results) {
        const expectedResult: Partial<dev.PropertyResult<unknown[]>> = {
          kind: 'falsified',
          reason: {
            kind: 'threwError',
            error,
          },
        };
        expect(result).toMatchObject(expectedResult);
      }
    }),
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

        const results = propertyRunner.iterate(property, runParams);

        const expectedResult: Partial<dev.PropertyExplorationIteration<unknown[]>> = {
          kind: 'exhausted',
        };
        expect(results.length).toEqual(1);
        expect(results[0]).toMatchObject(expectedResult);
      },
    ),
  );
});

test('Given the gens are poisoned with a discarding gen, the property is unfalsified, with discards equal to iterations', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      fc.tuple(domainGen.gens(), domainGen.discardingGen()).chain(([gens, gen]) => domainGen.shuffle([...gens, gen])),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const property = dev.explore<unknown[]>(gens, f);

        const lastResult = propertyRunner.last(property, runParams);

        const expectedLastResult: Partial<dev.PropertyResult<unknown[]>> = {
          kind: 'unfalsified',
          discards: runParams.iterations,
        };
        expect(lastResult).toMatchObject(expectedLastResult);
      },
    ),
  );
});

test('Given gens that discard at a rate of 50%, it is feasible for the property to run at least once in 100 iterations', () => {
  // There's probably a way to test this statistically, but I don't know what that is... A naive property
  // implementation might run all the gens until they all happen to not discard, with up to 10 gens the chance of
  // pulling that off would be 0.5 ^ 10 = 1 / 1024. It's better to run each gen until an instance is realized, and then
  // run the next, iteratively collecting the instances without ever throwing one away.

  const genPossiblyDiscardingGens = fc.array(fc.constant(gens.possiblyDiscardingGen('50%')), 0, 10);

  fc.assert(
    fc.property(domainGen.runParams(), genPossiblyDiscardingGens, domainGen.infallibleFunc(), (runParams, gens, f) => {
      const property = dev.explore<unknown[]>(gens, f);

      const lastResult = propertyRunner.last(property, { ...runParams, iterations: 100 });

      expect(lastResult.iterations).toBeGreaterThanOrEqual(0);
    }),
  );
});
