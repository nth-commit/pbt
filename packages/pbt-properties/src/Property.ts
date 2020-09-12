import { Gens } from 'pbt-core';
import { success, exhaustionFailure, predicateFailure, PropertyResult, ValidationProblem } from './PropertyResult';
import { PropertyConfig, preValidateConfig } from './PropertyConfig';
import runProperty, { PropertyCounterexample, PropertyFunction } from './runProperty';

export interface Property<TGens extends Gens> {
  (config: PropertyConfig): PropertyResult<TGens>;
}

export const property = <TGens extends Gens>(...args: [...TGens, PropertyFunction<TGens>]): Property<TGens> => {
  const gs = args.slice(0, args.length - 1) as TGens;
  const f = args[args.length - 1] as PropertyFunction<TGens>;

  return (config) => {
    const validationError = preValidateConfig(config);
    if (validationError) return validationError;

    const runResult = runProperty(gs, f, config);
    switch (runResult.kind) {
      case 'success':
        return success();
      case 'exhaustionFailure':
        return exhaustionFailure(config.iterations, runResult.iterationNumber - 1);
      case 'predicateFailure':
        return predicateFailure(
          runResult.seed,
          runResult.size,
          runResult.counterexample as PropertyCounterexample<TGens>,
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
