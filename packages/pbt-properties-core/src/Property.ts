import { Gen } from 'pbt-generator-core';
import { success, exhaustionFailure, predicateFailure, PropertyResult } from './PropertyResult';
import { PropertyConfig, validateConfig } from './PropertyConfig';
import runProperty, { PropertyFunction } from './runProperty';

type Gens = Array<Gen<any>>;

type GenValue<T> = T extends Gen<infer U> ? U : never;

type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };

export interface Property<T> {
  (config: PropertyConfig): PropertyResult;
  _?: T;
}

const constantProperty = (f: PropertyFunction<[]>): Property<[]> => config => {
  const validationError = validateConfig(config);
  if (validationError) return validationError;

  // It's kinda meaningless to repeat a constant property, but we do so for API symmetry.
  for (let i = 0; i < config.iterations; i++) {
    if (f() === false) {
      return predicateFailure();
    }
  }

  return success();
};

const variableProperty = <TGens extends Gens>(
  gs: TGens,
  f: PropertyFunction<TGens>,
): Property<GenValues<TGens>> => config => {
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

export const property = <TGens extends Gens>(
  ...args: [...TGens, PropertyFunction<TGens>]
): Property<GenValues<TGens>> => {
  const gs = args.slice(0, args.length - 1) as TGens;
  const f = args[args.length - 1] as PropertyFunction<TGens>;

  return gs.length === 0 ? ((constantProperty(f) as unknown) as Property<GenValues<TGens>>) : variableProperty(gs, f);
};
