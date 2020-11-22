import { ElementGen, GenFactory } from '../Abstractions';
import { GenStreamer } from '../GenStream';
import { RawGenImpl } from './RawGenImpl';

export const element = <T>(collection: ElementGen.Collection<T>, genFactory: GenFactory): ElementGen<T> => {
  class ElementGenImpl extends RawGenImpl<T> implements ElementGen<T> {
    constructor() {
      super(() => elementStreamer(collection, genFactory), genFactory);
    }
  }

  return new ElementGenImpl();
};

export const elementStreamer = <T>(collection: ElementGen.Collection<T>, genFactory: GenFactory): GenStreamer<T> => {
  const elements = Array.isArray(collection)
    ? collection
    : collection instanceof Set
    ? [...collection.values()]
    : collection instanceof Map
    ? [...collection.values()]
    : Object.values(collection);

  if (elements.length === 0) {
    return GenStreamer.error('Gen.element invoked with empty collection');
  }

  return GenStreamer.fromGen(
    genFactory
      .integer()
      .between(0, elements.length - 1)
      .noBias()
      .map((i) => elements[i])
      .noShrink()
      .noComplexity(),
  );
};
