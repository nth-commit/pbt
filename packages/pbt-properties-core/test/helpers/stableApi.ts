import * as fc from 'fast-check';

export const stableProperty: typeof fc.property = fc.property;

export const stableAssert: typeof fc.assert = (prop: any, params: any) => {
  const numRuns = process.env.fastCheckRuns ? parseInt(process.env.fastCheckRuns) : 50;
  return fc.assert(prop, {
    numRuns,
    ...params,
  });
};
