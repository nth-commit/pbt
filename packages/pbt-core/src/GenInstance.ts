import { pipe, concat, toArray, empty } from 'ix/iterable';
import { map as mapIterable } from 'ix/iterable/operators';

export type GenInstanceData<T> = {
  readonly value: T;
  shrink(): Iterable<GenInstanceData<T>>;
};

export type GenInstance<T> = {
  kind: 'instance';
} & GenInstanceData<T>;

export type GenInstances = GenInstance<any>[];

type GenInstanceValue<T> = T extends GenInstance<infer U> ? U : never;

type GenInstanceValues<TGenInstances extends GenInstances> = {
  [P in keyof TGenInstances]: GenInstanceValue<TGenInstances[P]>;
};

export type GenInstanceMapper<TGenInstances extends GenInstances> = (
  ...args: GenInstanceValues<TGenInstances>
) => boolean;

export type EvaluatedInstance<T> = T | [T, Array<EvaluatedInstance<T>>];

export namespace GenInstance {
  export const bindData = <T, U>(x: GenInstanceData<T>, k: (x: T) => GenInstanceData<U>): GenInstanceData<U> => {
    const y = k(x.value);
    return {
      value: y.value,
      shrink: () =>
        concat(
          y.shrink(),
          pipe(
            x.shrink(),
            mapIterable((x0) => bindData(x0, k)),
          ),
        ),
    };
  };

  export const mapData = <T, U>(x: GenInstanceData<T>, f: (x: T) => U): GenInstanceData<U> => ({
    value: f(x.value),
    shrink: () =>
      pipe(
        x.shrink(),
        mapIterable((x0) => mapData(x0, f)),
      ),
  });

  export const bind = <T, U>(x: GenInstance<T>, k: (x: T) => GenInstance<U>): GenInstance<U> => ({
    kind: 'instance',
    ...bindData(x, k),
  });

  export const map = <T, U>(x: GenInstance<T>, f: (x: T) => U): GenInstance<U> => ({
    kind: 'instance',
    ...mapData(x, f),
  });

  export const mapMany = <TGenInstances extends GenInstances, TResult>(
    ...args: [...TGenInstances, GenInstanceMapper<TGenInstances>]
  ): GenInstance<TResult> => {
    const instances = args.slice(0, args.length - 1) as TGenInstances;
    const f = args[args.length - 1] as GenInstanceMapper<TGenInstances>;

    const bindRec = (is: GenInstance<any>[], xs: any[]): GenInstance<TResult> => {
      switch (is.length) {
        case 0:
          return {
            kind: 'instance',
            value: [] as any,
            shrink: () => empty(),
          };
        case 1:
          return map(is[0] as any, (x0) => (f as any)(...xs, x0));
        default:
          return bind(is[0], (x) => bindRec(is.slice(1), [...xs, x]));
      }
    };

    return bindRec(instances, []);
  };

  export const zip = <TGenInstances extends GenInstances>(
    ...args: TGenInstances
  ): GenInstance<GenInstanceValues<TGenInstances>> => mapMany(...([...args, (...xs: any[]) => xs] as any));

  type EvaluatedInstanceComplex<T> = [T, Array<EvaluatedInstanceComplex<T>>];

  const evaluateInstanceComplex = <T>(instance: GenInstanceData<T>): EvaluatedInstanceComplex<T> => {
    const evaluatedShrinks = toArray(
      pipe(
        instance.shrink(),
        mapIterable((i) => evaluateInstanceComplex(i)),
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

  export const evaluateInstance = <T>(instance: GenInstanceData<T>): EvaluatedInstance<T> =>
    simplifyEvaluation(evaluateInstanceComplex(instance));
}
