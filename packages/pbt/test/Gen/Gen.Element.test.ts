import fc from 'fast-check';
import * as dev from '../../src/Gen';
import * as domainGen from './Helpers/domainGen';
import { iterate, iterateOutcomes } from './Helpers/genRunner';

test('When given an empty collection, it exhausts', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.collection(0, 0), (runParams, collection) => {
      const gen = dev.element(collection);

      const iterations = iterate(gen, runParams);

      expect(iterations).toEqual([{ kind: 'exhaustion' }]);
    }),
  );
});

test('When given a non-empty array, it returns an element in that array', () => {
  fc.assert(
    fc.property(domainGen.runParams(), fc.array(fc.anything(), 1, 10), (runParams, array) => {
      const gen = dev.element(array);

      const outcomes = iterateOutcomes(gen, runParams);

      for (const outcome of outcomes) {
        expect(array).toContainEqual(outcome);
      }
    }),
  );
});

test('When given a non-empty record, it returns an element in that record', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.record(fc.string(), fc.anything(), 1, 10), (runParams, record) => {
      const gen = dev.element(record);

      const outcomes = iterateOutcomes(gen, runParams);

      for (const outcome of outcomes) {
        expect(Object.values(record)).toContainEqual(outcome);
      }
    }),
  );
});

test('When given a non-empty set, it returns an element in that set', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.set(fc.anything(), 1, 10), (runParams, set) => {
      const gen = dev.element(set);

      const outcomes = iterateOutcomes(gen, runParams);

      for (const outcome of outcomes) {
        expect(set).toContainEqual(outcome);
      }
    }),
  );
});

test('When given a non-empty map, it returns an element in that map', () => {
  fc.assert(
    fc.property(domainGen.runParams(), domainGen.map(fc.anything(), fc.anything(), 1, 10), (runParams, map) => {
      const gen = dev.element(map);

      const outcomes = iterateOutcomes(gen, runParams);

      for (const outcome of outcomes) {
        expect(map.values()).toContainEqual(outcome);
      }
    }),
  );
});
