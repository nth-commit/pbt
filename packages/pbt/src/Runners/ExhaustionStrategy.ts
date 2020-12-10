import { OperatorFunction } from 'ix/interfaces';
import { pipe } from 'ix/iterable';
import { flatMap } from 'ix/iterable/operators';

export const Exhausted = Symbol('Exhausted');

export type Exhaustible<T> = { kind: 'exhausted' } | T;

export type ExhaustionStrategy = {
  onDiscard(): void;
  onIteration(): void;
  isExhausted(): boolean;
};

export namespace ExhaustionStrategy {
  export const asOperator = <Iteration>(
    isDiscard: (iteration: Iteration) => boolean,
    exhaustionStrategy: ExhaustionStrategy = defaultStrategy(),
  ): OperatorFunction<Iteration, Exhaustible<Iteration>> =>
    flatMap((iteration) => {
      if (exhaustionStrategy.isExhausted()) {
        throw new Error('Fatal: Attempted to take iteration after stream was exhausted');
      }

      exhaustionStrategy.onIteration();

      if (isDiscard(iteration)) {
        exhaustionStrategy.onDiscard();
      }

      return exhaustionStrategy.isExhausted() ? [iteration, { kind: 'exhausted' }] : [iteration];
    });

  export const apply = <Iteration>(
    stream: Iterable<Iteration>,
    isDiscard: (iteration: Iteration) => boolean,
    exhaustionStrategy: ExhaustionStrategy = defaultStrategy(),
  ): Iterable<Exhaustible<Iteration>> => pipe(stream, asOperator(isDiscard, exhaustionStrategy));

  export const whenDiscardRateExceeds = (rate: number): ExhaustionStrategy => {
    if (rate < 0 || rate > 1) throw new Error('Fatal: Discard rate out-of-range');

    let discardCount = 0;
    let totalCount = 0;

    return {
      onDiscard: () => {
        discardCount++;
      },
      onIteration: () => {
        totalCount++;
      },
      isExhausted: () => {
        const discardRate = discardCount / totalCount;
        return discardRate > rate;
      },
    };
  };

  export const whenDiscardCountExceeds = (count: number): ExhaustionStrategy => {
    if (count < 0) throw new Error('Fatal: Discard count out-of-range');

    let discardCount = 0;

    return {
      onDiscard: () => {
        discardCount++;
      },
      onIteration: () => {},
      isExhausted: () => {
        return discardCount > count;
      },
    };
  };

  export const whenAll = (...exhaustionStrategies: ExhaustionStrategy[]): ExhaustionStrategy => ({
    onDiscard: () => exhaustionStrategies.forEach((s) => s.onDiscard()),
    onIteration: () => exhaustionStrategies.forEach((s) => s.onIteration()),
    isExhausted: () => exhaustionStrategies.every((s) => s.isExhausted()),
  });

  export const defaultStrategy = () =>
    ExhaustionStrategy.whenAll(
      ExhaustionStrategy.whenDiscardRateExceeds(0.999),
      ExhaustionStrategy.whenDiscardCountExceeds(999),
    );
}
