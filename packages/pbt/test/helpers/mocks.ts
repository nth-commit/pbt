import * as dev from '../../src';

export const properties = {
  success: (): dev.Property<unknown[]> => () => ({ kind: 'success' }),
  failure: (result: dev.PropertyResult.Failure<unknown[]>): dev.Property<unknown[]> => () => result,
};
