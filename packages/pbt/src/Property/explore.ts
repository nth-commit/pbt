import { empty, pipe, repeatValue, first } from 'ix/iterable';
import { map } from 'ix/iterable/operators';
import { Gen, GenIteration, Seed, Size, Tree } from './Imports';
import { PropertyFunction, PropertyFunctionInvocation } from './PropertyFunction';
import { PropertyIteration, AnyValues, Trees } from './PropertyIteration';
import { Property } from './Property';

type Gens<Values extends AnyValues> = { [P in keyof Values]: Gen<Values[P]> };

const runGens = <Values extends AnyValues>(gens: Gens<Values>, seed: Seed): Values => {
  const trees = gens.map((gen) =>
    first(
      pipe(
        gen(seed, 0),
        map((genIteration) => (genIteration as GenIteration.Instance<any>).tree),
      ),
    ),
  ) as Trees<Values>;
  return trees.map(Tree.outcome) as Values;
};

export const explore = <Values extends AnyValues>(gens: Gens<Values>, f: PropertyFunction<Values>): Property<Values> =>
  function* (seed: Seed, size: Size) {
    let currentSeed = seed;

    while (true) {
      const propertyIterationFactory = PropertyIteration.factory(currentSeed);
      const [leftSeed, rightSeed] = currentSeed.split();

      const values = runGens(gens, rightSeed);

      const invocation = PropertyFunction.invoke(f, values);
      switch (invocation.kind) {
        case 'success':
          yield propertyIterationFactory.success(size);
          break;
        case 'failure':
          yield propertyIterationFactory.falsification(size, null as any, invocation.reason);
          return;
      }

      currentSeed = leftSeed;
    }
  };
