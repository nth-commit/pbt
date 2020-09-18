import { pipe, of, concat, empty } from 'ix/iterable';
import { map, flatMap, filter } from 'ix/iterable/operators';
import { takeWhileInclusive } from './iterableOperators';
import { Gen as IGen, GenInstanceData, GenResult } from 'pbt-core';
import { GenLike, mapGenLike } from './GenLike';
import { Shrink } from './Shrink';
import { Tree } from './Tree';
import { TreeGenInstance, TreeGenResult } from './TreeGenResult';
import * as SeedExtensions from './SeedExtensions';

export type ITreeGen<T> = GenLike<TreeGenResult<T>>;

export type TreeGen<T> = ITreeGen<T> & {
  map: <U>(f: (x: T) => U) => TreeGen<U>;
  filter: (f: (x: T) => boolean) => TreeGen<T>;
  flatMap: <U>(k: (x: T) => TreeGen<U>) => TreeGen<U>;
  reduce: <U>(length: number, f: (acc: U, x: T, i: number) => U, init: U) => TreeGen<U>;
  noShrink: () => TreeGen<T>;
  preShrink: (shrinker: Shrink<T>) => TreeGen<T>;
};

const mapResult = <T, U>(f: (x: T) => U) => (r: TreeGenResult<T>): TreeGenResult<U> => {
  if (TreeGenResult.isNotInstance(r)) return r;

  return {
    kind: 'instance',
    value: Tree.map(r.value, f),
  };
};

const filterResult = <T>(f: (x: T) => boolean) => (r: TreeGenResult<T>): TreeGenResult<T> => {
  if (TreeGenResult.isNotInstance(r)) return r;

  const [outcome, shrinks] = r.value;
  if (f(outcome) === false) return { kind: 'discard' };

  return {
    kind: 'instance',
    value: Tree.create(outcome, Tree.filterForest(shrinks, f)),
  };
};

const flatMapInstanceOnce = <T, U>(r: TreeGenInstance<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
  // Given a single instance, runs the gen returned by `k` until it sees another instance. Then, merges the existing
  // instance and the newly generated instance by combining their shrinks, in accordance with `k`. Produces a gen
  // that contains all intermediate non-instance values (e.g. discards or exhaustions), followed by the single
  // successfully bound instance.

  const treeFolder = (outcome0: T, rs: Iterable<TreeGenResult<U>>): Iterable<TreeGenResult<U>> => {
    const treeGenK = k(outcome0);

    const values0 = pipe(
      rs,
      filter(TreeGenResult.isInstance),
      map((r0) => r0.value),
    );

    return pipe(
      treeGenK(seed, size),
      takeWhileInclusive(TreeGenResult.isNotInstance),
      map((r1) =>
        TreeGenResult.mapTreeInstance(r1, ([outcome1, values1]) => Tree.create(outcome1, concat(values0, values1))),
      ),
    );
  };

  const forestFolder = (rss: Iterable<Iterable<TreeGenResult<U>>>): Iterable<TreeGenResult<U>> =>
    pipe(
      rss,
      flatMap((x) => x),
    );

  return Tree.fold<T, Iterable<TreeGenResult<U>>, Iterable<TreeGenResult<U>>>(r.value, treeFolder, forestFolder);
};

const flatMapGenOnce = <T, U>(treeGenBase: ITreeGen<T>, k: (x: T) => ITreeGen<U>): ITreeGen<U> => (seed, size) => {
  // Runs the left gen until it finds and instance, then flatMaps that instance by passing it to `flatMapInstanceOnce`.
  // Produces a gen that contains all discarded instances from the left gen and the right gen, followed by the single
  // bound instance.

  const [leftSeed, rightSeed] = seed.split();
  return pipe(
    treeGenBase(leftSeed, size),
    flatMap((r) => {
      if (TreeGenResult.isNotInstance(r)) return of(r);
      return flatMapInstanceOnce(r, k)(rightSeed, size);
    }),
    takeWhileInclusive(TreeGenResult.isNotInstance),
  );
};

const reduceTreeGenOnce = <T, U>(
  treeGenBase: ITreeGen<T>,
  length: number,
  f: (acc: U, x: T, i: number) => U,
  init: U,
): ITreeGen<U> =>
  function* (seed, size) {
    let reduction = {
      acc: init,
      trees: [] as Array<Tree<T>>,
    };

    for (const result of treeGenBase(seed, size)) {
      switch (result.kind) {
        case 'instance':
          const tree = result.value;
          reduction = {
            acc: f(reduction.acc, tree[0], reduction.trees.length),
            trees: [...reduction.trees, tree],
          };
          break;
        case 'discard':
        case 'exhaustion':
          yield result;
      }

      if (reduction.trees.length >= length) break;
    }

    yield {
      kind: 'instance',
      value: Tree.map(
        Tree.combine(reduction.trees),
        (xs): U => xs.reduce((acc: U, curr: T, i: number) => f(acc, curr, i), init),
      ),
    };
  };

const discardShrinks = <T>(r: TreeGenResult<T>): TreeGenResult<T> => {
  if (TreeGenResult.isNotInstance(r)) return r;

  const [outcome] = r.value;
  return {
    kind: 'instance',
    value: Tree.create(outcome, empty()),
  };
};

const expandShrinksForResult = <T>(shrinker: Shrink<T>) => (r: TreeGenResult<T>): TreeGenResult<T> => {
  if (TreeGenResult.isNotInstance(r)) return r;

  return {
    kind: 'instance',
    value: Tree.expand(r.value, shrinker),
  };
};

const extendTreeGen = <T>(treeGenBase: ITreeGen<T>): TreeGen<T> => {
  const mapTreeGen = <U>(f: (x: T) => U): TreeGen<U> => extendTreeGen<U>(mapGenLike(treeGenBase, mapResult(f)));

  const filterTreeGen = (f: (x: T) => boolean): TreeGen<T> =>
    extendTreeGen<T>(mapGenLike(treeGenBase, filterResult(f)));

  const flatMapTreeGen = <U>(k: (x: T) => TreeGen<U>): TreeGen<U> =>
    extendTreeGen<U>((seed, size) =>
      pipe(
        SeedExtensions.stream(seed),
        flatMap((seed0) => {
          const nextTreeGen = flatMapGenOnce(treeGenBase, k);
          return nextTreeGen(seed0, size);
        }),
      ),
    );

  const reduceTreeGen = <U>(length: number, f: (acc: U, x: T, i: number) => U, init: U): TreeGen<U> =>
    extendTreeGen<U>((seed, size) =>
      pipe(
        SeedExtensions.stream(seed),
        flatMap((seed0) => {
          const nextTreeGen = reduceTreeGenOnce(treeGenBase, length, f, init);
          return nextTreeGen(seed0, size);
        }),
      ),
    );

  const noShrinkTreeGen = (): TreeGen<T> => extendTreeGen<T>(mapGenLike(treeGenBase, discardShrinks));

  const preShrinkTreeGen = (shrinker: Shrink<T>): TreeGen<T> =>
    extendTreeGen<T>(mapGenLike(treeGenBase, expandShrinksForResult(shrinker)));

  return Object.assign(treeGenBase, {
    map: mapTreeGen,
    filter: filterTreeGen,
    flatMap: flatMapTreeGen,
    reduce: reduceTreeGen,
    noShrink: noShrinkTreeGen,
    preShrink: preShrinkTreeGen,
  });
};

const id = <T>(x: T): T => x;

const toTreeGenResult = <T>(r: GenResult<T>): TreeGenResult<T> => {
  if (r.kind !== 'instance') return r;

  return {
    kind: 'instance',
    value: Tree.unfold<GenInstanceData<T>, T>(
      (r) => r.value,
      (r) => r.shrink(),
      r,
    ),
  };
};

export namespace TreeGen {
  export const fromGenLike = <T>(g: GenLike<T>, shrink: Shrink<T>): TreeGen<T> =>
    extendTreeGen(
      mapGenLike(g, (x) => ({
        kind: 'instance',
        value: Tree.unfold(id, shrink, x),
      })),
    );

  export const fromGen = <T>(g: IGen<T>): TreeGen<T> => extendTreeGen(mapGenLike(g, toTreeGenResult));

  export const exhausted = <T>(): TreeGen<T> => extendTreeGen(() => of({ kind: 'exhaustion' }));
}
