import { Gens } from 'pbt-core';
import { success, exhausted, failed, PropertyResult } from './PropertyResult';
import { PropertyConfig, preValidateConfig } from './PropertyConfig';
import runProperty, { PropertyFunction } from './runProperty';
import { GenValues } from './GenValues';

export interface Property<Values extends any[]> {
  (config: PropertyConfig): PropertyResult<Values>;
}

export const property = <TGens extends Gens>(
  ...args: [...TGens, PropertyFunction<GenValues<TGens>>]
): Property<GenValues<TGens>> => {
  const gs = args.slice(0, args.length - 1) as TGens;
  const f = args[args.length - 1] as PropertyFunction<GenValues<TGens>>;

  return (config) => {
    const validationError = preValidateConfig(config);
    if (validationError) return validationError;

    const runResult = runProperty(gs as any, f, config);
    switch (runResult.kind) {
      case 'success':
        return success();
      case 'exhaustion':
        return exhausted(config.iterations, runResult.iterationNumber - 1);
      case 'failure':
        return failed(
          runResult.reason,
          runResult.seed,
          runResult.size,
          config.iterations,
          runResult.iterationNumber,
          runResult.counterexample,
        );
      case 'invalidShrinkPath':
        return {
          kind: 'validationFailure',
          problem: {
            kind: 'shrinkPath',
            message:
              'Shrink path was invalidated, re-run failing property without specifying shrinkPath to receive a relevant counterexample',
          },
        };
    }
  };
};
