import { Gen } from 'pbt-generator-core';
import { success, exhaustionFailure, predicateFailure, PropertyResult } from './PropertyResult';
import { PropertyConfig, validateConfig } from './PropertyConfig';
import runProperty, { Gens, PropertyFunction } from './runProperty';

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

export interface Property<T> {
  (config: PropertyConfig): PropertyResult;
  _?: T;
}

export const property = <TGens extends Gens>(
  ...args: [...TGens, PropertyFunction<TGens>]
): Property<GenValues<TGens>> => {
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
        return predicateFailure();
    }
  };
};
