import { pipe, toArray } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import * as devCore from 'pbt-core';

type EvaluatedInstance<T> = [T, Array<EvaluatedInstance<T>>];

export type SimpleEvaluatedInstance<T> = T | [T, Array<SimpleEvaluatedInstance<T>>];

const evaluateInstanceComplex = <T>(instance: devCore.GenInstanceData<T>): EvaluatedInstance<T> => {
  const evaluatedShrinks = toArray(
    pipe(
      instance.shrink(),
      map((i) => evaluateInstanceComplex(i)),
    ),
  );
  return [instance.value, evaluatedShrinks];
};

const simplifyEvaluation = <T>([x, xs]: EvaluatedInstance<T>): SimpleEvaluatedInstance<T> => {
  if (xs.length === 0) {
    return x;
  }
  return [x, xs.map(simplifyEvaluation)];
};

export const evaluateInstance = <T>(instance: devCore.GenInstanceData<T>): SimpleEvaluatedInstance<T> =>
  simplifyEvaluation(evaluateInstanceComplex(instance));
