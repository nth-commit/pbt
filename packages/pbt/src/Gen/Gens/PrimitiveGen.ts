import { Size } from '../../Core';
import { GenTree } from '../../GenTree';
import { Gen } from '../Gen';
import { GenIteration } from '../GenIteration';
import { GenRunnable } from '../GenRunnable';
import { GenTransformation } from '../GenTransformation';
import { Shrink } from '../Shrink';
import { GenImpl } from './GenImpl';
import { Calculator, Integer, Real } from '../../Number';

export type PrimitiveGen<T> = Gen<T>;

export namespace PrimitiveGen {
  export type NextIntFunction<TNumber> = (min: Integer<TNumber>, max: Integer<TNumber>) => Integer<TNumber>;

  export type StatefulGenFunction<T, TNumber> = (useNextInt: NextIntFunction<TNumber>, size: Size) => T;

  export type CalculateComplexity<T, TNumber> = (value: T) => Real<TNumber>;
}

export const PrimitiveGen = {
  create: <T, TNumber>(
    calculator: Calculator<TNumber>,
    generate: PrimitiveGen.StatefulGenFunction<T, TNumber>,
    shrink: Shrink<T>,
    measure: PrimitiveGen.CalculateComplexity<T, TNumber>,
  ): PrimitiveGen<T> => {
    const gen: GenRunnable<T> = {
      run: function* (rng, size) {
        const initRng = rng;
        const initSize = size;

        const useNextInt: PrimitiveGen.NextIntFunction<TNumber> = (min, max) => {
          const rngValue = rng.value<TNumber>(calculator, min, max);
          rng = rng.next();
          return rngValue;
        };

        const value = generate(useNextInt, size);
        const tree = GenTree.unfold(
          value,
          (x) => x,
          shrink,
          (x) => calculator.unload(measure(x)),
        );
        yield GenIteration.instance(tree, initRng, rng, initSize, size);
      },
    };

    return new GenImpl(gen, GenTransformation.repeat<T>());
  },
};
