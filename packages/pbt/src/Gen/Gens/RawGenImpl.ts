import { GenFactory } from '../Abstractions';
import { GenStreamer, GenStreamerTransformation } from '../GenStream';
import { GenImpl } from './GenImpl';

export class RawGenImpl<T> extends GenImpl<T, T> {
  /**
   * @param makeStreamer A unit function that returns a streamer function. This is a function, because the fluent
   * interfaces for creating generators can be quite chatty, otherwise doing a lot of unnecessary initialisation of the
   * streamer.
   * @param genFactory Functional hooks for creating generators, whilst avoiding circular deps.
   */
  constructor(makeStreamer: () => GenStreamer<T>, genFactory: GenFactory) {
    super(makeStreamer, GenStreamerTransformation.none(), genFactory);
  }
}
