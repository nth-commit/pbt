import { Gens, Seed } from 'pbt-core';
import { GenValues, Property, PropertyConfig, PropertyResult } from 'pbt-properties';

const makeDefaultConfig = (): PropertyConfig => ({
  iterations: 100,
  seed: Seed.spawn(),
  size: 0,
});

export const run = <TGens extends Gens>(
  p: Property<TGens>,
  config: Partial<PropertyConfig> = {},
): PropertyResult<TGens> => {
  const resolvedConfig = {
    ...makeDefaultConfig(),
    ...config,
  };

  return p(resolvedConfig);
};
