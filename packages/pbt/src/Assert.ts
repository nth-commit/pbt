import { Property } from 'pbt-properties';
import { run, RunConfig, RunResult } from './Run';

export type AssertionJournal = string[];

export const assert = <Values extends any[]>(p: Property<Values>, config?: Partial<RunConfig>): AssertionJournal => {
  const result = run(p, config);
  switch (result.kind) {
    case 'success':
      return [];
    case 'failure':
      return [...renderTitle(result), ...renderReproduction(result), ...renderCounterexample(result)];
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
