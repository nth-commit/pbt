import { Gens } from 'pbt-core';
import { success, exhaustionFailure, predicateFailure, PropertyResult } from './PropertyResult';
import { PropertyConfig, validateConfig } from './PropertyConfig';
import runProperty, { PropertyFunction } from './runProperty';
import { GenValues } from './GenValues';

export interface Property<TGens extends Gens> {
  (config: PropertyConfig): PropertyResult<TGens>;
}

export const property = <TGens extends Gens>(...args: [...TGens, PropertyFunction<TGens>]): Property<TGens> => {
  /* istanbul ignore next */
  if (args.length <= 1) {
    throw new Error('Property requires at least one Gen');
  }

  const gs = args.slice(0, args.length - 1) as TGens;
  const f = args[args.length - 1] as PropertyFunction<TGens>;

  return (config) => {
    const validationError = validateConfig(config);
    if (validationError) return validationError;

    const { iterations } = config;
    const { lastIteration } = runProperty(gs, f, config);

    switch (lastIteration.iterationStatus) {
      case 'success':
        return success();
      case 'exhaustionFailure':
        return exhaustionFailure(iterations, lastIteration.iterationNumber - 1);
      case 'predicateFailure':
        return predicateFailure(lastIteration.minimalCounterexample as GenValues<TGens>);
    }
  };
};
