import fc from 'fast-check';
import { of } from 'ix/iterable';
import * as dev from '../../src/Public';
import * as domainGen from './Helpers/domainGen';

const parseReproductionLogEntry = (str: string): { seed: number; size: number; counterexamplePath: string } => {
  const regex = /Reproduction: (\{.*\})/;

  const match = str.match(regex);
  if (!match) {
    throw new Error('Failed to parse reproduction log entry');
  }

  return JSON.parse(match[1]);
};

const parseCounterexampleLogEntry = (str: string): unknown[] => {
  const regex = /Counterexample: (\[.*\])/;

  const match = str.match(regex);
  if (!match) {
    throw new Error('Failed to parse counterexample log entry');
  }

  return JSON.parse(match[1]);
};

interface IProperty extends dev.Property<dev.AnyValues> {}

const mockProperty = (result: dev.PropertyResult<dev.AnyValues>): IProperty =>
  (({
    configure: () => mockProperty(result),
    run: () => of(result),
    toString: () => `Mock property with result: ${JSON.stringify(result)}`,
  } as unknown) as IProperty);

const getAssertMessage = (property: dev.Property<dev.AnyValues>, config?: dev.AssertConfig): string => {
  try {
    dev.assert(property, config);
  } catch (e) {
    return (e as Error)?.message || '';
  }

  throw new Error('Expected assertion to fail');
};

test('The log is empty for an infallible property', () => {
  fc.assert(
    fc.property(domainGen.unfalsifiedPropertyResult(), (propertyResult) => {
      const p = mockProperty(propertyResult);

      expect(() => dev.assert(p)).not.toThrow();
    }),
  );
});

test('The log documents the number of tests of a fallible property', () => {
  fc.assert(
    fc.property(domainGen.falsifiedPropertyResult(), (propertyResult) => {
      const p = mockProperty(propertyResult);

      const message = getAssertMessage(p);

      expect(message).not.toBeNull();
      expect(message.split('\n')[0]).toEqual(`Property failed after ${propertyResult.iterations} test(s)`);
    }),
  );
});

test('The log documents the seed and size needed to reproduce a fallible property', () => {
  fc.assert(
    fc.property(domainGen.falsifiedPropertyResult(), (propertyResult) => {
      const p = mockProperty(propertyResult);

      const message = getAssertMessage(p);

      expect(message).not.toBeNull();
      const reproductionLogEntry = message.split('\n')[1];
      expect(reproductionLogEntry).toContain('Reproduction: ');

      const reproduction = parseReproductionLogEntry(reproductionLogEntry);
      expect(reproduction).toMatchObject({
        seed: propertyResult.seed.valueOf(),
        size: propertyResult.size,
      });
    }),
  );
});

test('The log documents the counterexamplePath needed to reproduce a fallible property', () => {
  fc.assert(
    fc.property(domainGen.falsifiedPropertyResult(), (propertyResult) => {
      const p = mockProperty(propertyResult);

      const message = getAssertMessage(p);

      expect(message).not.toBeNull();
      const reproductionLogEntry = message.split('\n')[1];
      expect(reproductionLogEntry).toContain('Reproduction: ');

      const reproduction = parseReproductionLogEntry(reproductionLogEntry);
      expect(reproduction).toEqual({
        seed: expect.anything(),
        size: expect.anything(),
        counterexamplePath: propertyResult.counterexamplePath,
      });
    }),
  );
});

test('The log documents the counterexample for a fallible property', () => {
  fc.assert(
    fc.property(domainGen.falsifiedPropertyResult(), (propertyResult) => {
      const p = mockProperty(propertyResult);

      const message = getAssertMessage(p);

      expect(message).not.toBeNull();
      const counterexampleLogEntry = message.split('\n')[2];
      expect(counterexampleLogEntry).toContain('Counterexample: ');

      // Roundtrip through JSON serializer to remove any anomalies like Infinity serializing as null
      const expectedCounterexample = JSON.parse(JSON.stringify(propertyResult.counterexample));
      const counterexample = parseCounterexampleLogEntry(counterexampleLogEntry);
      expect(counterexample).toEqual(expectedCounterexample);
    }),
  );
});

test('The log terminates after the counterexample for a property that return false', () => {
  fc.assert(
    fc.property(domainGen.falsifiedPropertyResult(), (propertyResult) => {
      const p = mockProperty({
        ...propertyResult,
        reason: {
          kind: 'returnedFalse',
        },
      });

      const message = getAssertMessage(p);

      expect(message).not.toBeNull();
      expect(message.split('\n')).toHaveLength(3);
    }),
  );
});

test('The log terminates after the counterexample when the error is not formattable', () => {
  const genNonFormattableError = (): fc.Arbitrary<unknown> =>
    fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.constant(''),
      fc.anything().filter((x) => typeof x !== 'object' && typeof x !== 'string'),
    );

  fc.assert(
    fc.property(domainGen.falsifiedPropertyResult(), genNonFormattableError(), (propertyResult, error) => {
      const p = mockProperty({
        ...propertyResult,
        reason: {
          kind: 'threwError',
          error,
        },
      });

      const message = getAssertMessage(p);

      expect(message).not.toBeNull();
      expect(message.split('\n')).toHaveLength(3);
    }),
  );
});

test('The log contains the thrown string', () => {
  fc.assert(
    fc.property(
      domainGen.falsifiedPropertyResult(),
      fc.string().filter((s) => s.length > 0),
      (propertyResult, error) => {
        const p = mockProperty({
          ...propertyResult,
          reason: {
            kind: 'threwError',
            error,
          },
        });

        const message = getAssertMessage(p);

        expect(message).toContain(error);
      },
    ),
  );
});

test("The log contains the thrown error's message", () => {
  fc.assert(
    fc.property(
      domainGen.falsifiedPropertyResult(),
      fc.string().filter((s) => s.length > 0),
      (propertyResult, errorMessage) => {
        const p = mockProperty({
          ...propertyResult,
          reason: {
            kind: 'threwError',
            error: new Error(errorMessage),
          },
        });

        const message = getAssertMessage(p);

        expect(message).toContain(errorMessage);
      },
    ),
  );
});
