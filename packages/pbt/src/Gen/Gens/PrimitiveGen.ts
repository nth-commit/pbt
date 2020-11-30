import { GenTree } from '../../GenTree';
import { GenFactory, GenLite, PrimitiveGen } from '../Abstractions';
import { GenIteration } from '../GenIteration';
import { Shrink } from '../Shrink';
import { GenImpl } from './GenImpl';
import { GenTransformation } from './GenTransformation';

export const primitive = <T>(
  generate: PrimitiveGen.StatefulGenFunction<T>,
  shrink: Shrink<T>,
  measure: GenTree.CalculateComplexity<T>,
  genFactory: GenFactory,
): PrimitiveGen<T> => {
  const gen: GenLite<T> = {
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

  return new GenImpl(gen, GenTransformation.repeat<T>(), genFactory);
};
