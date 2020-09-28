import { empty, pipe } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import * as dev from '../../../src/Property';

export const possiblyDiscardingGen = (discardPercentage: '50%'): dev.Gen<unknown> =>
  Object.assign(
    (seed: dev.Seed) =>
      pipe(
        dev.Seed.stream(seed),
        map(
          (seed0): dev.GenIteration<unknown> => {
            const value = seed0.nextInt(0, 1);
            switch (discardPercentage) {
              case '50%':
                return value % 2 === 0
                  ? {
                      kind: 'instance',
                      tree: dev.Tree.create(value, empty()),
                    }
                  : {
                      kind: 'discarded',
                      value,
                    };
              default:
                throw new Error('Fatal: Unhandled discard ratio');
            }
          },
        ),
      ),
    {
      toString: () => `possiblyDiscardingGen`,
    },
  );
