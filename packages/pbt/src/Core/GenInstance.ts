/* istanbul ignore file */
import { pipe, toArray, from } from 'ix/iterable';
import { flatMap, map } from 'ix/iterable/operators';

export type GenInstanceData<T> = {
  readonly value: T;
  shrink(): Iterable<GenInstanceData<T>>;
};

export type GenInstance<T> = {
  kind: 'instance';
} & GenInstanceData<T>;

export type GenInstances = GenInstance<any>[];

type GenInstanceDatas = GenInstanceData<any>[];

type GenInstanceValue<T> = T extends GenInstanceData<infer U> ? U : never;

type GenInstanceValues<TGenInstanceDatas extends GenInstanceDatas> = {
  [P in keyof TGenInstanceDatas]: GenInstanceValue<TGenInstanceDatas[P]>;
};

export type GenInstanceMapper<TGenInstances extends GenInstances> = (
  ...args: GenInstanceValues<TGenInstances>
) => boolean;

export type EvaluatedInstance<T> = T | [T, Array<EvaluatedInstance<T>>];

export namespace GenInstance {
  type EvaluatedInstanceComplex<T> = [T, Array<EvaluatedInstanceComplex<T>>];

  const evaluateInstanceComplex = <T>(instance: GenInstanceData<T>): EvaluatedInstanceComplex<T> => {
    const evaluatedShrinks = toArray(
      pipe(
        instance.shrink(),
        map((i) => evaluateInstanceComplex(i)),
      ),
    );
    return [instance.value, evaluatedShrinks];
  };

  const simplifyEvaluation = <T>([x, xs]: EvaluatedInstanceComplex<T>): EvaluatedInstance<T> => {
    if (xs.length === 0) {
      return x;
    }
    return [x, xs.map(simplifyEvaluation)];
  };

  export const evaluate = <T>(instance: GenInstanceData<T>): EvaluatedInstance<T> =>
    simplifyEvaluation(evaluateInstanceComplex(instance));

  function unfoldData<Seed, T>(f: (x: Seed) => T, g: (x: Seed) => Iterable<Seed>, x: Seed): GenInstanceData<T> {
    return {
      value: f(x),
      shrink: () => unfoldDatas(f, g, x),
    };
  }

  function unfoldDatas<Seed, T>(
    f: (x: Seed) => T,
    g: (x: Seed) => Iterable<Seed>,
    x: Seed,
  ): Iterable<GenInstanceData<T>> {
    return pipe(
      g(x),
      map((y) => unfoldData(f, g, y)),
    );
  }

  export const unfold = <Seed, T>(f: (x: Seed) => T, g: (x: Seed) => Iterable<Seed>, x: Seed): GenInstance<T> => ({
    kind: 'instance',
    ...unfoldData(f, g, x),
  });

  const joinDatas = <TGenInstanceDatas extends GenInstanceDatas>(
    ...instanceDatas: TGenInstanceDatas
  ): GenInstanceData<GenInstanceValues<TGenInstanceDatas>> => ({
    value: instanceDatas.map((d) => d.value) as GenInstanceValues<TGenInstanceDatas>,
    shrink: () =>
      pipe(
        from(instanceDatas),
        map((instanceData, i) => {
          const leftInstanceDatas = instanceDatas.slice(0, i);
          const rightInstanceDatas = instanceDatas.slice(i + 1);
          return pipe(
            instanceData.shrink(),
            map((instanceDataShrink) => joinDatas(...leftInstanceDatas, instanceDataShrink, ...rightInstanceDatas)),
          );
        }),
        flatMap((x) => x),
      ) as Iterable<GenInstanceData<GenInstanceValues<TGenInstanceDatas>>>,
  });

  export const join = <TGenInstances extends GenInstances>(
    ...instances: TGenInstances
  ): GenInstance<GenInstanceValues<TGenInstances>> => ({
    kind: 'instance',
    ...joinDatas(...instances),
  });

  const formatInternal = (instance: GenInstanceData<string>, nestCount: number): string => {
    const valueFormatted = '-'.repeat(nestCount * 3) + instance.value;

    const shrinksFormatted = toArray(
      pipe(
        instance.shrink(),
        map((i) => formatInternal(i, nestCount + 1)),
      ),
    );

    return [valueFormatted, ...shrinksFormatted].join('\n');
  };

  export const format = (instance: GenInstanceData<string>): string => formatInternal(instance, 0);
}
