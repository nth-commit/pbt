import { Gen } from 'pbt-generator-core';

export type PropertyReport = {};

export interface Property<T> {
  (): PropertyReport;
}

export const property = <T>(g: Gen<T>, f: (x: T) => boolean): Property<T> => {
  return () => {
    for (const genInstance of g(0, 0)) {
      f(genInstance.value);
    }

    return null as any;
  };
};
