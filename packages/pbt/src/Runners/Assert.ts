import { Property } from '../Property';
import { check, CheckConfig, CheckResult } from './Check';

export type AssertConfig = CheckConfig;

export const assert = <Ts extends any[]>(property: Property<Ts>, config: Partial<AssertConfig> = {}): void => {
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

const buildAssertionJournal = <Ts extends any[]>(
  p: Property<Ts>,
  config?: Partial<AssertConfig>,
): AssertionJournal | null => {
  const result = check(p, config);
  switch (result.kind) {
    case 'unfalsified':
      return null;
    case 'falsified':
      return {
        entries: [...renderTitle(result), ...renderReproduction(result), ...renderCounterexample(result)],
        error: result.counterexample.reason.kind === 'threwError' ? result.counterexample.reason.error : undefined,
      };
    /* istanbul ignore next */
    default:
      throw new Error(`Unhandled result: ${JSON.stringify(result)}`);
  }
};

const renderTitle = (result: CheckResult.Falsified<any[]>): string[] => [
  `Property failed after ${result.iterations} test(s)`,
];

const renderReproduction = (result: CheckResult.Falsified<any[]>): string[] => {
  let str = `Reproduction: { "seed": ${result.seed}, "size": ${result.size}`;

  str += `, "path": "${result.counterexample.path}"`;

  str += ` }`;

  return [str];
};

const renderCounterexample = (result: CheckResult.Falsified<any[]>): string[] => [
  `Counterexample: ${JSON.stringify(result.counterexample.value)}`,
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
