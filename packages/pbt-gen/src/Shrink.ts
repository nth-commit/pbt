import { pipe, generate, concat, of, empty } from 'ix/iterable';
import { map } from 'ix/iterable/operators';

export type Shrink<T> = (value: T) => Iterable<T>;

export namespace Shrink {
  const halves = (value: number, dp: number): Iterable<number> => {
    const sign = Math.sign(value);
    const absValue = Math.abs(value);
    const end = absValue < 1 ? empty() : of(1);

    return pipe(
      concat(
        generate(
          absValue,
          (x) => x > 1,
          (x) => Math.round(x / 2),
          (x) => x,
        ),
        end,
      ),
      map((x) => x * sign),
    );
  };

  export const towardsNumber = (target: number, dp: number): Shrink<number> => (value) =>
    pipe(
      halves(value - target, dp),
      map((x) => value - x),
    );
}
