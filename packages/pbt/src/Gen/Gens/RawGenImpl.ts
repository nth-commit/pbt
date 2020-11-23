import { Rng, Size } from '../../Core';
import { GenConfig, GenFactory, GenLite, GenStream } from '../Abstractions';
import { GenImpl } from './GenImpl';
import { GenTransformation } from './GenTransformation';

export class RawGenImpl<T> extends GenImpl<T, T> {
  static fromRunFunction<T>(
    run: (rng: Rng, size: Size, config: GenConfig) => GenStream<T>,
    genFactory: GenFactory,
  ): RawGenImpl<T> {
    return new RawGenImpl({ run }, genFactory);
  }

  constructor(gen: GenLite<T>, genFactory: GenFactory) {
    super(gen, GenTransformation.none(), genFactory);
  }
}
