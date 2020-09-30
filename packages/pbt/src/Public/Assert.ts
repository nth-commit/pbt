import { UnknownValues, Property, PropertyResult } from './Property';
import { check } from './Check';

export type AssertConfig = {
  iterations: number;
  seed: number;
  size: number;
  counterexamplePath: string | undefined;
};

export const assert = <Values extends any[]>(property: Property<Values>, config: Partial<AssertConfig> = {}): void => {
  const assertionJournal = buildAssertionJournal(property, config);
  if (!assertionJournal) {
    return;
  }
  throw buildError(assertionJournal);
};

type AssertionJournal = {
  entries: string[];
  error?: unknown;
};

const buildAssertionJournal = <Values extends any[]>(
  p: Property<Values>,
  config?: Partial<AssertConfig>,
): AssertionJournal | null => {
  const result = check(p, config);
  switch (result.kind) {
    case 'unfalsified':
      return null;
    case 'falsified':
      return {
        entries: [...renderTitle(result), ...renderReproduction(result), ...renderCounterexample(result)],
        error: result.reason.kind === 'threwError' ? result.reason.error : undefined,
      };
    /* istanbul ignore next */
    default:
      throw new Error(`Unhandled result: ${JSON.stringify(result)}`);
  }
};

const renderTitle = (result: PropertyResult.Falsified<UnknownValues>): string[] => [
  `Property failed after ${result.iterations} test(s)`,
];

const renderReproduction = (result: PropertyResult.Falsified<UnknownValues>): string[] => {
  let str = `Reproduction: { "seed": ${result.seed}, "size": ${result.size}`;

  if (result.counterexamplePath) {
    str += `, "counterexamplePath": "${result.counterexamplePath}"`;
  }

  str += ` }`;

  return [str];
};

const renderCounterexample = (result: PropertyResult.Falsified<UnknownValues>): string[] => [
  `Counterexample: ${JSON.stringify(result.counterexample)}`,
];

export class PbtAssertionError extends Error {}

const buildError = (assertionJournal: AssertionJournal): Error => {
  const { entries, error } = assertionJournal;
  const normalizedError = normalizeError(error);

  if (typeof normalizedError === 'object' && normalizedError !== null) {
    const objError = normalizedError as any;
    /* istanbul ignore next */
    const originalMessage = objError.message || '';
    objError.message = createErrorMessage(entries, originalMessage);
    return objError;
  }

  return buildPbtAssertionError(entries, normalizedError);
};

const normalizeError = (error: unknown): Object | string | null => {
  switch (typeof error) {
    case 'object':
      return error;
    case 'string':
      return error;
    default:
      return null;
  }
};

const buildPbtAssertionError = (journalEntries: string[], originalErrorMessage: string | null): PbtAssertionError =>
  new PbtAssertionError(createErrorMessage(journalEntries, originalErrorMessage));

const createErrorMessage = (assertionJournal: string[], originalErrorMessage: string | null): string => {
  const errorMessageLines = originalErrorMessage ? [...assertionJournal, ' ', originalErrorMessage] : assertionJournal;
  return errorMessageLines.join('\n');
};
