import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';
import * as spies from '../helpers/spies';

test('A generator receives the initial size', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gen(), domainGen.fallibleFunc(), (runParams, gen, f) => {
      const genSpy = spies.spyOn(gen);
      const property = dev.explore([genSpy], f);

      propertyRunner.iterate(property, { ...runParams, iterations: 1 });

      expect(genSpy).toBeCalledTimes(1);
      expect(genSpy).toBeCalledWith(expect.anything(), runParams.size);
    }),
  );
});

test('A generator always receives a size, where 0 <= size <= 100', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().filter((g) => g.length > 0),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const genSpies = spies.spyOnAll(gens);
        const property = dev.explore(genSpies, f);

        propertyRunner.iterate(property, runParams);

        for (const genSpy of genSpies) {
          for (const [, size] of genSpy.mock.calls) {
            expect(size).toBeGreaterThanOrEqual(0);
            expect(size).toBeLessThanOrEqual(100);
          }
        }
      },
    ),
  );
});

test('Given initial size = 0, then each generator is ultimately invoked with a size, where size = (iterations - 1) % 100', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().filter((g) => g.length > 0),
      domainGen.infallibleFunc(),
      (runParams, gens, f) => {
        const genSpies = spies.spyOnAll(gens);
        const property = dev.explore(genSpies, f);

        propertyRunner.iterate(property, { ...runParams, size: 0 });

        for (const genSpy of genSpies) {
          const [_, lastSize] = genSpy.mock.calls[runParams.iterations - 1];
          expect(lastSize).toEqual((runParams.iterations - 1) % 100);
        }
      },
    ),
  );
});
