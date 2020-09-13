/* istanbul ignore file */
export { Seed, Size, Gen as IGen } from 'pbt-core';
export { integer, create, exhausted, Gen } from 'pbt-gen';
export { property, Property } from 'pbt-properties';
export { run, RunConfig, RunResult } from './Run';

import { Property } from 'pbt-properties';
import { assert as assertInternal } from './Assert';
import { RunConfig } from './Run';

export class PbtAssertionError extends Error {}

export const assert = <Values extends any[]>(p: Property<Values>, config?: Partial<RunConfig>): void => {
  const assertionJournal = assertInternal(p, config);
  if (assertionJournal.length > 0) {
    throw new PbtAssertionError(assertionJournal.join('\n'));
  }
};
