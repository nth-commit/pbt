export type AnyF = (...args: any[]) => any;

export type ArgsType<F extends AnyF> = F extends (...args: infer Args) => any ? Args : any;

export const withInvocationCount = <F extends AnyF>(f: (i: number, ...args: ArgsType<F>) => ReturnType<F>): F => {
  let i = 0;

  const f0: F = ((...args: ArgsType<F>) => {
    i++;
    return f(i, ...args);
  }) as F;

  return f0;
};
