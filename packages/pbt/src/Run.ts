import { Seed } from 'pbt-core';
import { Property, PropertyConfig, PropertyResult } from 'pbt-properties';

const makeDefaultConfig = (): PropertyConfig => ({
  iterations: 100,
  seed: Seed.spawn(),
  size: 0,
});

export const run = (p: Property<unknown>, config: Partial<PropertyConfig> = {}): PropertyResult => {
  const resolvedConfig = {
    ...makeDefaultConfig(),
    ...config,
  };

  return p(resolvedConfig);
};
