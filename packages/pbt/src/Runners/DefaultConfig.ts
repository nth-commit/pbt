import { Size } from '../Core';

export type DefaultConfig = {
  seed: number;
  size: Size;
  iterations: number;
};

let setDefaultConfig: Partial<DefaultConfig> = {};

export function defaultConfig(config: Partial<DefaultConfig>): void {
  setDefaultConfig = config;
}

/**
 * @private
 */
export function getDefaultConfig(runnerSpecificDefaultConfig: Pick<DefaultConfig, 'size'>): Readonly<DefaultConfig> {
  return {
    iterations: 100,
    seed: Date.now(),
    ...runnerSpecificDefaultConfig,
    ...setDefaultConfig,
  };
}
