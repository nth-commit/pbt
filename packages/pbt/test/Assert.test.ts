import fc from 'fast-check';
import * as devInternal from '../src/Assert';
import * as devProperties from 'pbt-properties';
import { arbitraryFailurePropertyResult, arbitraryPredicateFailurePropertyResult } from './helpers/arbitraries';
import * as stable from './helpers/stableApi';
import * as mocks from './helpers/mocks';
import * as spies from './helpers/spies';

describe('About buildAssertionJournal', () => {
  const parseReproductionJournalEntry = (str: string): { seed: number; size: number; shrinkPath: string } => {
    const regex = /Reproduction: (\{.*\})/;

    const match = str.match(regex);
    if (!match) {
      throw new Error('Failed to parse reproduction journal entry');
    }

    return JSON.parse(match[1]);
  };

  const parseCounterexampleJournalEntry = (str: string): unknown[] => {
    const regex = /Counterexample: (\[.*\])/;

    const match = str.match(regex);
    if (!match) {
      throw new Error('Failed to parse counterexample journal entry');
    }

    return JSON.parse(match[1]);
  };

  test('Input defaults are passed through', () => {
    stable.assert(
      stable.property(fc.anything(), () => {
        const p = spies.spyOn(mocks.properties.success());

        devInternal.buildAssertionJournal(p);

        const expectedPropertyConfig: devProperties.PropertyConfig = {
          iterations: 100,
          seed: expect.anything(),
          size: 0,
          shrinkPath: undefined,
        };
        const calls = spies.calls(p);
        expect(calls).toHaveLength(1);
        expect(calls[0][0]).toEqual(expectedPropertyConfig);
      }),
    );
  });

  test('Input seed is marshalled correctly', () => {
    stable.assert(
      stable.property(fc.nat(), (seed) => {
        const p = spies.spyOn(mocks.properties.success());

        devInternal.buildAssertionJournal(p, { seed });

        const calls = spies.calls(p);
        expect(calls).toHaveLength(1);
        expect(calls[0][0].seed.valueOf()).toEqual(seed);
      }),
    );
  });

  test('Input size is passed through', () => {
    stable.assert(
      stable.property(fc.integer(), (size) => {
        const p = spies.spyOn(mocks.properties.success());

        devInternal.buildAssertionJournal(p, { size });

        const calls = spies.calls(p);
        expect(calls).toHaveLength(1);
        expect(calls[0][0].size).toEqual(size);
      }),
    );
  });

  test('Input iterations is passed through', () => {
    stable.assert(
      stable.property(fc.integer(), (iterations) => {
        const p = spies.spyOn(mocks.properties.success());

        devInternal.buildAssertionJournal(p, { iterations });

        const calls = spies.calls(p);
        expect(calls).toHaveLength(1);
        expect(calls[0][0].iterations).toEqual(iterations);
      }),
    );
  });

  test('Input shrinkPath is marshalled correctly', () => {
    const shrinkPathExamples: [string, number[]][] = [
      ['0', [0]],
      ['1', [1]],
      ['0:1', [0, 1]],
      ['0:1:0:1:0:1', [0, 1, 0, 1, 0, 1]],
      ['10:15:2:8:0:6', [10, 15, 2, 8, 0, 6]],
      ['adasdd:0:1', [NaN, 0, 1]],
    ];

    stable.assert(
      stable.property(fc.constantFrom(...shrinkPathExamples), ([shrinkPath, expectedShrinkPath]) => {
        const p = spies.spyOn(mocks.properties.success());

        devInternal.buildAssertionJournal(p, { shrinkPath });

        const calls = spies.calls(p);
        expect(calls).toHaveLength(1);
        expect(calls[0][0].shrinkPath).toEqual(expectedShrinkPath);
      }),
    );
  });

  test('The journal is empty for an infallible property', () => {
    stable.assert(
      stable.property(fc.anything(), () => {
        const p = mocks.properties.success();

        const journal = devInternal.buildAssertionJournal(p);

        expect(journal).toBeNull();
      }),
    );
  });

  test('The journal documents the number of tests of a fallible property', () => {
    stable.assert(
      stable.property(arbitraryFailurePropertyResult(), (r) => {
        const p = mocks.properties.failure(r);

        const journal = devInternal.buildAssertionJournal(p);

        expect(journal).not.toBeNull();
        expect(journal!.entries[0]).toEqual(`Property failed after ${r.iterationsCompleted} test(s)`);
      }),
    );
  });

  test('The journal documents the seed and size needed to reproduce a fallible property', () => {
    stable.assert(
      stable.property(arbitraryFailurePropertyResult(), (r) => {
        const p = mocks.properties.failure(r);

        const journal = devInternal.buildAssertionJournal(p);

        expect(journal).not.toBeNull();
        const reproductionJournalEntry = journal!.entries[1];
        expect(reproductionJournalEntry).toContain('Reproduction: ');

        const reproduction = parseReproductionJournalEntry(reproductionJournalEntry);
        expect(reproduction).toMatchObject({
          seed: r.seed.valueOf(),
          size: r.size,
        });
      }),
    );
  });

  test('The journal documents the shrinkPath needed to reproduce a fallible property', () => {
    const shrinkPathExamples: [number[], string | undefined][] = [
      [[], undefined],
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

          const journal = devInternal.buildAssertionJournal(p);

          expect(journal).not.toBeNull();
          const reproductionJournalEntry = journal!.entries[1];
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

  test('The journal documents the counterexample for a fallible property', () => {
    stable.assert(
      stable.property(arbitraryFailurePropertyResult(), (r) => {
        const p = mocks.properties.failure(r);

        const journal = devInternal.buildAssertionJournal(p);

        expect(journal).not.toBeNull();
        const counterexampleJournalEntry = journal!.entries[2];
        expect(counterexampleJournalEntry).toContain('Counterexample: ');

        // Roundtrip through JSON serializer to remove any anomalies like Infinity serializing as null
        const expectedCounterexample = JSON.parse(JSON.stringify(r.counterexample.values));
        const counterexample = parseCounterexampleJournalEntry(counterexampleJournalEntry);
        expect(counterexample).toEqual(expectedCounterexample);
      }),
    );
  });

  test('The journal terminates after the counterexample, for a property that return false', () => {
    stable.assert(
      stable.property(arbitraryPredicateFailurePropertyResult(), (r) => {
        const p = mocks.properties.failure(r);

        const journal = devInternal.buildAssertionJournal(p);

        expect(journal).not.toBeNull();
        expect(journal!.entries).toHaveLength(3);
      }),
    );
  });
});

describe('About buildError', () => {
  const arbitraryJournalEntries = (): fc.Arbitrary<string[]> => fc.array(fc.string(), 1, 10);

  test('It wraps the journal entries when the error is not formattable', () => {
    const arbitraryNonFormattableError = (): fc.Arbitrary<unknown> =>
      fc.oneof(
        fc.constant(null),
        fc.constant(undefined),
        fc.constant(''),
        fc.anything().filter((x) => typeof x !== 'object' && typeof x !== 'string'),
      );

    stable.assert(
      stable.property(arbitraryJournalEntries(), arbitraryNonFormattableError(), (entries, innerError) => {
        const error = devInternal.buildError({ entries, error: innerError });

        expect(error.message).toEqual(entries.join('\n'));
      }),
    );
  });

  test('It prepends a thrown string with the journal entries', () => {
    stable.assert(
      stable.property(
        arbitraryJournalEntries(),
        fc.string().filter((s) => s.length > 0),
        (entries, innerError) => {
          const error = devInternal.buildError({ entries, error: innerError });

          expect(error.message).toEqual([...entries, ' ', innerError].join('\n'));
        },
      ),
    );
  });

  test("It prepends a thrown error's message with the journal entries", () => {
    stable.assert(
      stable.property(
        arbitraryJournalEntries(),
        fc.string().filter((s) => s.length > 0),
        (entries, innerErrorMessage) => {
          const innerError = new Error(innerErrorMessage);
          const error = devInternal.buildError({ entries, error: innerError });

          expect(error).toBe(innerError);
          expect(error.message).toEqual([...entries, ' ', innerErrorMessage].join('\n'));
        },
      ),
    );
  });
});
