import { Size } from '../Core';

export type DefaultConfig = {
  seed: number;
  iterations: number;
};

let setDefaultConfig: Partial<DefaultConfig> = {};

export function defaultConfig(config: Partial<DefaultConfig>): void {
  setDefaultConfig = config;
}

/**
 * @private
 */
export function getDefaultConfig(): Readonly<DefaultConfig> {
  return {
    iterations: 100,
    seed: Date.now(),
    ...setDefaultConfig,
  };
}
