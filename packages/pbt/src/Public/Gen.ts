import { Seed, Size } from '../Core';
import * as Internal from '../Gen';
import { RandomStream } from './RandomStream';

export class Gen<T> implements RandomStream<Internal.GenIteration<T>> {
  static create<T>(f: (seed: Seed, size: Size) => T, shrinker: Internal.Shrinker<T>): Gen<T> {
    return new Gen(Internal.create(f, shrinker));
  }

  private constructor(private gen: Internal.Gen<T>) {}

  filter(predicate: (x: T) => boolean): Gen<T> {
    return new Gen<T>(Internal.operators.filter(this.gen, predicate));
  }

  noShrink(): Gen<T> {
    return new Gen<T>(Internal.operators.noShrink(this.gen));
  }

  run(seed: Seed, size: Size): Iterable<Internal.GenIteration<T>> {
    return this.gen(seed, size);
  }
}
