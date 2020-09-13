import * as dev from '../../src';
import * as devProperties from 'pbt-properties';

export const properties = {
  success: (): dev.Property<unknown[]> => () => ({ kind: 'success' }),
  failure: (result: devProperties.PropertyResult.Failure<unknown[]>): dev.Property<unknown[]> => () => result,
};
