import { Property } from 'pbt-properties';
import { run } from './Run';

export const assert = <Values extends any[]>(p: Property<Values>) => {
  const result = run(p);
  switch (result.kind) {
    case 'success':
      return [];
    case 'failure':
      return [
        `Property failed after ${result.iterationsCompleted} test(s)`,
        `Reproduction: { "seed": ${result.seed}, "size": ${result.size}, "shrinkPath": "${result.counterexample.shrinkPath}" }`,
      ];
    /* istanbul ignore next */
    default:
      throw new Error('Unhandled');
  }
};
