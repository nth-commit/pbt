import { Gen } from '../Gen';
import { GenRunnable } from '../GenRunnable';
import { RawGenImpl } from './RawGenImpl';

export type ElementGen<T> = Gen<T>;

export namespace ElementGen {
  export type Collection<T> = Readonly<T[] | Record<any, T> | Set<T> | Map<unknown, T>>;
}

export const ElementGen = {
  create: <T>(collection: ElementGen.Collection<T>): ElementGen<T> => new RawGenImpl<T>(genElement(collection)),
};

const genElement = <T>(collection: ElementGen.Collection<T>): GenRunnable<T> => {
  const elements = Array.isArray(collection)
    ? collection
    : collection instanceof Set
    ? [...collection.values()]
    : collection instanceof Map
    ? [...collection.values()]
    : Object.values(collection);

  if (elements.length === 0) {
    return Gen.error('Gen.element invoked with empty collection');
  }

  return Gen.integer()
    .between(0, elements.length - 1)
    .noBias()
    .noShrink()
    .map((i) => elements[i]);
};
