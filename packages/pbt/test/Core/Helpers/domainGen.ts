import * as stable from 'pbt';

export const element = <T>(...elements: T[]): stable.Gen<T> => {
  const numberOfElements = elements.length;
  if (numberOfElements === 0) {
    throw new Error('Expected at least one element');
  }

  return stable.Gen.integer()
    .between(0, numberOfElements - 1)
    .map((i) => elements[i]);
};
