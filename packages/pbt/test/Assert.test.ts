import fc from 'fast-check';
import * as dev from '../src/Assert';
import { arbitraryFailurePropertyResult } from './helpers/arbitraries';
import * as stable from './helpers/stableApi';
import * as mocks from './helpers/mocks';

const parseReproductionJournalEntry = (str: string): { seed: number; size: number; shrinkPath: string } => {
  const regex = /Reproduction: (\{.*\})/;

  const match = str.match(regex);
  if (!match) {
    throw new Error('Failed to parse reproduction journal entry');
  }

  return JSON.parse(match[1]);
};

test('The journal is empty for a succeeding property', () => {
  stable.assert(
    stable.property(fc.anything(), () => {
      const p = mocks.properties.success();

      const journal = dev.assert(p);

      expect(journal).toHaveLength(0);
    }),
  );
});

test('The journal documents the number of tests of a failing property', () => {
  stable.assert(
    stable.property(arbitraryFailurePropertyResult(), (r) => {
      const p = mocks.properties.failure(r);

      const journal = dev.assert(p);

      expect(journal[0]).toEqual(`Property failed after ${r.iterationsCompleted} test(s)`);
    }),
  );
});

test('The journal documents the seed and size needed to reproduce a failing property', () => {
  stable.assert(
    stable.property(arbitraryFailurePropertyResult(), (r) => {
      const p = mocks.properties.failure(r);

      const journal = dev.assert(p);

      const reproductionJournalEntry = journal[1];
      expect(reproductionJournalEntry).toContain('Reproduction: ');

      const reproduction = parseReproductionJournalEntry(reproductionJournalEntry);
      expect(reproduction).toEqual({
        seed: r.seed.valueOf(),
        size: r.size,
        shrinkPath: expect.anything(),
      });
    }),
  );
});

test('The journal documents the shrinkPath needed to reproduce a failing property', () => {
  const shrinkPathExamples: [number[], string][] = [
    [[0], '0'],
    [[1], '1'],
    [[0, 1], '0:1'],
    [[0, 1, 0, 1, 0, 1], '0:1:0:1:0:1'],
    [[10, 15, 2, 8, 0, 6], '10:15:2:8:0:6'],
  ];

  stable.assert(
    stable.property(
      arbitraryFailurePropertyResult(),
      fc.constantFrom(...shrinkPathExamples),
      (r, [shrinkPath, expectedShrinkPath]) => {
        const p = mocks.properties.failure({
          ...r,
          counterexample: {
            ...r.counterexample,
            shrinkPath,
          },
        });

        const journal = dev.assert(p);

        const reproductionJournalEntry = journal[1];
        expect(reproductionJournalEntry).toContain('Reproduction: ');

        const reproduction = parseReproductionJournalEntry(reproductionJournalEntry);
        expect(reproduction).toEqual({
          seed: expect.anything(),
          size: expect.anything(),
          shrinkPath: expectedShrinkPath,
        });
      },
    ),
  );
});
