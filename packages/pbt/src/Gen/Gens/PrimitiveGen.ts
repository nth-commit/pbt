import { Size } from '../../Core';
import { GenTree } from '../../GenTree';
import { Gen, GenFactory, GenLite } from '../Abstractions';
import { GenIteration } from '../GenIteration';
import { Shrink } from '../Shrink';
import { GenImpl } from './GenImpl';
import { GenTransformation } from './GenTransformation';

export namespace primitive {
  export type NextIntFunction = (min: number, max: number) => number;

  export type StatefulGenFunction<T> = (useNextInt: NextIntFunction, size: Size) => T;
}

export const primitive = <T>(
  statefulGenFunction: primitive.StatefulGenFunction<T>,
  shrink: Shrink<T>,
  calculateComplexity: GenTree.CalculateComplexity<T>,
  genFactory: GenFactory,
): Gen<T> => {
  const gen: GenLite<T> = {
    run: function* (rng, size) {
      const initRng = rng;
      const initSize = size;

      const useNextInt: primitive.NextIntFunction = (min, max) => {
        const rngValue = rng.value(min, max);
        rng = rng.next();
        return rngValue;
      };

      const value = statefulGenFunction(useNextInt, size);
      const tree = GenTree.unfold(value, (x) => x, shrink, calculateComplexity);
      yield GenIteration.instance(tree, initRng, rng, initSize, size);
    },
  };

  return new GenImpl(gen, GenTransformation.repeat<T>(), genFactory);
};
