import * as dev from '../../../src/Public';

type FilterByKind<T extends { kind: string }, Kind extends T['kind']> = T extends infer U
  ? U extends { kind: Kind }
    ? U
    : never
  : never;

export type FilterPropertyResultByKind<Kind extends dev.PropertyResult<dev.AnyValues>['kind']> = FilterByKind<
  dev.PropertyResult<dev.AnyValues>,
  Kind
>;

export const asFalsified = <Values extends dev.AnyValues>(
  propertyResult: dev.PropertyResult<Values>,
): FilterPropertyResultByKind<'falsified'> => {
  if (propertyResult.kind !== 'falsified') {
    throw new Error('Expected property result to be falsified');
  }

  return propertyResult;
};
