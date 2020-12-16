import { Size } from '../../Core';
import { Rng } from '../../Number';
import { GenConfig, GenRunnable, GenStream } from '../GenRunnable';
import { GenTransformation } from '../GenTransformation';
import { GenImpl } from './GenImpl';

export class RawGenImpl<T> extends GenImpl<T, T> {
  static fromRunFunction<T>(run: (rng: Rng, size: Size, config: GenConfig) => GenStream<T>): RawGenImpl<T> {
    return new RawGenImpl({ run });
  }

  constructor(gen: GenRunnable<T>) {
    super(gen, GenTransformation.none());
  }
}
