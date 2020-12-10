import { Size } from '../../Core';
import { GenTree } from '../../GenTree';
import { Gen } from '../Gen';
import { GenIteration } from '../GenIteration';
import { GenRunnable } from '../GenRunnable';
import { GenTransformation } from '../GenTransformation';
import { Shrink } from '../Shrink';
import { GenImpl } from './GenImpl';

export type PrimitiveGen<T> = Gen<T>;

export namespace PrimitiveGen {
  export type NextIntFunction = (min: number, max: number) => number;

  export type StatefulGenFunction<T> = (useNextInt: NextIntFunction, size: Size) => T;
}

export const PrimitiveGen = {
  create: <T>(
    generate: PrimitiveGen.StatefulGenFunction<T>,
    shrink: Shrink<T>,
    measure: GenTree.CalculateComplexity<T>,
  ): PrimitiveGen<T> => {
    const gen: GenRunnable<T> = {
      run: function* (rng, size) {
        const initRng = rng;
        const initSize = size;

        const useNextInt: PrimitiveGen.NextIntFunction = (min, max) => {
          const rngValue = rng.value(min, max);
          rng = rng.next();
          return rngValue;
        };

        const value = generate(useNextInt, size);
        const tree = GenTree.unfold(value, (x) => x, shrink, measure);
        yield GenIteration.instance(tree, initRng, rng, initSize, size);
      },
    };

    return new GenImpl(gen, GenTransformation.repeat<T>());
  },
};
