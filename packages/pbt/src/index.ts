/* istanbul ignore file */
export { Gen as IGen } from 'pbt-core';
export { Gen } from 'pbt-gen';
export * as gen from 'pbt-gen';
export { property, Property } from 'pbt-properties';
export { run, RunConfig, RunResult } from './Run';

import { Property } from 'pbt-properties';
import { assert as assertInternal } from './Assert';
import { RunConfig } from './Run';

export class PbtAssertionError extends Error {}

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

const createErrorMessage = (journalEntries: string[], originalErrorMessage?: string): string => {
  const errorMessageLines = originalErrorMessage ? [...journalEntries, ' ', originalErrorMessage] : journalEntries;
  return errorMessageLines.join('\n');
};

const throwPbtAssertionError = (journalEntries: string[], originalErrorMessage?: string): void => {
  throw new PbtAssertionError(createErrorMessage(journalEntries, originalErrorMessage));
};

export const assert = <Values extends any[]>(p: Property<Values>, config?: Partial<RunConfig>): void => {
  const assertionJournal = assertInternal(p, config);

  if (!assertionJournal) {
    return;
  }

  const { error, entries } = assertionJournal;

  const normalizedError = normalizeError(error);
  if (typeof normalizedError === 'object') {
    if (normalizedError === null) {
      throwPbtAssertionError(entries);
    } else if (normalizedError instanceof Error) {
      const objError = normalizedError as any;
      const originalMessage = objError.message || '';
      objError.message = createErrorMessage(entries, originalMessage);
      throw objError;
    } else {
      throwPbtAssertionError(entries);
    }
  } else if (typeof normalizedError === 'string') {
    throwPbtAssertionError(entries, normalizedError);
  }
};
