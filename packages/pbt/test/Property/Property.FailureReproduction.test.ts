import fc from 'fast-check';
import * as dev from '../../src/Property';
import * as devGen from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import * as propertyRunner from './Helpers/propertyRunner';
import { last, pipe } from 'ix/iterable';
import { filter } from 'ix/iterable/operators';

test('Given an invalid shrink path, it returns a validation error', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens(),
      domainGen.fallibleFunc(),
      fc.array(fc.integer(), 1, 10),
      (runParams, gens, f, shrinkPath) => {
        const unshrinkingGens = gens.map(devGen.noShrink); // No non-empty shrink path will be valid

        const reproduction = dev.reproduceFailure(unshrinkingGens, f, runParams.seed, runParams.size, shrinkPath);

        expect(reproduction.kind).toEqual('validationError');
      },
    ),
  );
});

test('Given an infallible property, it returns non-reproducible', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.gens(), domainGen.infallibleFunc(), (runParams, gens, f) => {
      const reproduction = dev.reproduceFailure(gens, f, runParams.seed, runParams.size, []);

      expect(reproduction.kind).toEqual('unreproducible');
    }),
  );
});

test('Given a fallible property, after an exploration, it can reproduce the non-shrunk result', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().filter((gens) => gens.length > 0),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const property = dev.explore<unknown[]>(gens, f);
        const falsification = propertyRunner.findFalsification(property, { ...runParams, iterations: 100 });

        const reproduction = dev.reproduceFailure(
          gens,
          f,
          falsification.seed,
          falsification.size,
          [],
        ) as dev.ReproductionResult.Reproducible<unknown[]>;

        expect(reproduction.counterexample).toEqual(dev.Tree.outcome(falsification.counterexample));
      },
    ),
  );
});

test('Given a fallible property, after an exploration and a shrink, it can reproduce the shrunk result', () => {
  fc.assert(
    fc.property(
      domainGen.runParams(),
      domainGen.gens().filter((gens) => gens.length > 0),
      domainGen.fallibleFunc(),
      (runParams, gens, f) => {
        const property = dev.explore<unknown[]>(gens, f);
        const falsification = propertyRunner.findFalsification(property, { ...runParams, iterations: 100 });
        const smallestCounterexample = last(
          pipe(
            dev.shrinkCounterexample(f, falsification.counterexample),
            filter((x) => x.kind === 'confirmed'),
          ),
        )!;

        const reproduction = dev.reproduceFailure(
          gens,
          f,
          falsification.seed,
          falsification.size,
          smallestCounterexample.path,
        ) as dev.ReproductionResult.Reproducible<unknown[]>;

        expect(reproduction.counterexample).toEqual(smallestCounterexample.values);
      },
    ),
  );
});
