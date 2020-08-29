import { Gen, Size } from 'pbt-core';

type AnyF = (...args: any) => any;

export type Arguments<T extends AnyF> = T extends (...args: infer U) => any ? U : any;

export type InferMock<T extends AnyF> = jest.Mock<ReturnType<T>, Arguments<T>>;

export const spyOn = <T extends AnyF>(f: T): InferMock<T> => jest.fn(f);

export type Spies<T extends Array<AnyF>> = {
  [P in keyof T]: T[P] extends AnyF ? InferMock<T[P]> : any;
};

export const spyOnAll = <T extends Array<AnyF>>(fs: T): Spies<T> => fs.map(spyOn) as Spies<T>;

export const calls = <T extends AnyF>(spy: InferMock<T>): Array<Arguments<T>> => spy.mock.calls;

export namespace GenSpy {
  export const observedSizes = <T extends Gen<any>>(spy: InferMock<T>): Array<Size> =>
    calls(spy).map((args) => args[1]);

  export const lastObservedSize = <T extends Gen<any>>(spy: InferMock<T>): Size | null => {
    const sizes = observedSizes(spy);
    return sizes[sizes.length - 1];
  };
}
