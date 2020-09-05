import * as devCore from 'pbt-core';

export const traverseShrinks = <T>(instance: devCore.GenInstanceData<T>, recursionLimit: number): T[] => {
  if (recursionLimit <= 0) return [];

  return Array.prototype.concat(
    [instance.value],
    ...Array.from(instance.shrink()).map((shrink) => traverseShrinks(shrink, recursionLimit - 1)),
  ) as T[];
};
