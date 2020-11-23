import { ElementGen, GenFactory, GenLite } from '../Abstractions';
import { RawGenImpl } from './RawGenImpl';

export const element = <T>(collection: ElementGen.Collection<T>, genFactory: GenFactory): ElementGen<T> => {
  class ElementGenImpl extends RawGenImpl<T> implements ElementGen<T> {
    constructor() {
      super(elementGen(collection, genFactory), genFactory);
    }
  }

  return new ElementGenImpl();
};

export const elementGen = <T>(collection: ElementGen.Collection<T>, genFactory: GenFactory): GenLite<T> => {
  const elements = Array.isArray(collection)
    ? collection
    : collection instanceof Set
    ? [...collection.values()]
    : collection instanceof Map
    ? [...collection.values()]
    : Object.values(collection);

  if (elements.length === 0) {
    return genFactory.error('Gen.element invoked with empty collection');
  }

  return genFactory
    .integer()
    .between(0, elements.length - 1)
    .noBias()
    .map((i) => elements[i])
    .noShrink();
};
