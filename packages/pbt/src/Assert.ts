import { Property } from 'pbt-properties';
import { run, RunConfig, RunResult } from './Run';

export type AssertionJournal = {
  entries: string[];
  error?: unknown;
};

export const buildAssertionJournal = <Values extends any[]>(
  p: Property<Values>,
  config?: Partial<RunConfig>,
): AssertionJournal | null => {
  const result = run(p, config);
  switch (result.kind) {
    case 'success':
      return null;
    case 'failure':
      return {
        entries: [...renderTitle(result), ...renderReproduction(result), ...renderCounterexample(result)],
        error: result.reason.kind === 'throws' ? result.reason.error : undefined,
      };
    /* istanbul ignore next */
    default:
      throw new Error(`Unhandled result: ${JSON.stringify(result)}`);
  }
};

const renderTitle = (result: RunResult.Failure): string[] => [
  `Property failed after ${result.iterationsCompleted} test(s)`,
];

const renderReproduction = (result: RunResult.Failure): string[] => {
  let str = `Reproduction: { "seed": ${result.seed}, "size": ${result.size}`;

  if (result.counterexample.shrinkPath) {
    str += `, "shrinkPath": "${result.counterexample.shrinkPath}"`;
  }

  str += ` }`;

  return [str];
};

const renderCounterexample = (result: RunResult.Failure): string[] => [
  `Counterexample: ${JSON.stringify(result.counterexample.values)}`,
];

export class PbtAssertionError extends Error {}

export const buildError = (assertionJournal: AssertionJournal): Error => {
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

export const assert = <Values extends any[]>(p: Property<Values>, config?: Partial<RunConfig>): void => {
  const assertionJournal = buildAssertionJournal(p, config);
  if (!assertionJournal) {
    return;
  }
  throw buildError(assertionJournal);
};
