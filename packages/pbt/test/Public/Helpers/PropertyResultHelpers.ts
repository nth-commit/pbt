import * as dev from '../../../src/Public';

type FilterByKind<T extends { kind: string }, TKind extends T['kind']> = T extends infer U
  ? U extends { kind: TKind }
    ? U
    : never
  : never;

export const asFalsified = <Values extends dev.AnyValues>(
  propertyResult: dev.PropertyResult<Values>,
): FilterByKind<dev.PropertyResult<Values>, 'falsified'> => {
  if (propertyResult.kind !== 'falsified') {
    throw new Error('Expected property result to be falsified');
  }

  return propertyResult;
};
