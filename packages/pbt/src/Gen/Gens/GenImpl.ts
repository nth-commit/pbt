import { Rng } from '../../Core';
import { GenTree } from '../../GenTree';
import { ArrayGen, Gen, GenConfig, GenFactory } from '../Abstractions';
import { GenStream, GenStreamer, GenStreamerTransformation } from '../GenStream';

export class GenImpl<TInit, TCurr = TInit> implements Gen<TCurr> {
  /**
   * @param makeStreamer A unit function that returns a streamer function. This is a function, because the fluent
   * interfaces for creating generators can be quite chatty, otherwise doing a lot of unnecessary initialisation of the
   * streamer.
   * @param transformation A transformation on the streamer. This is the main composition mechanism for generators.
   * Subsequent operations on a generator will decorate the transformation, causing a pipelining effect.
   * @param genFactory Functional hooks for creating generators, whilst avoiding circular deps.
   */
  constructor(
    private readonly makeStreamer: () => GenStreamer<TInit>,
    private readonly transformation: GenStreamerTransformation<TInit, TCurr>,
    private readonly genFactory: GenFactory,
  ) {}

  array(): ArrayGen<TCurr> {
    return this.genFactory.array(this);
  }

  map<TNext>(mapper: (x: TCurr) => TNext): Gen<TNext> {
    return this.transform(
      GenStreamerTransformation.transformInstances((instance) => ({
        ...instance,
        tree: GenTree.map(instance.tree, (x) => mapper(x)),
      })),
    );
  }

  flatMap<TNext>(mapper: (x: TCurr) => Gen<TNext>): Gen<TNext> {
    const streamerMapper = (x: TCurr): GenStreamer<TNext> => (rng, size, config) => mapper(x).run(rng, size, config);
    return this.transform(GenStreamerTransformation.flatMap(streamerMapper));
  }

  filter(predicate: (x: TCurr) => boolean): Gen<TCurr> {
    return this.transform(GenStreamerTransformation.filter(predicate));
  }

  noShrink(): Gen<TCurr> {
    return this.transform(
      GenStreamerTransformation.transformInstances((instance) => ({
        ...instance,
        tree: GenTree.create(instance.tree.node, []),
      })),
    );
  }

  noComplexity(): Gen<TCurr> {
    return this.transform(
      GenStreamerTransformation.transformInstances((instance) => ({
        ...instance,
        tree: GenTree.mapNode(instance.tree, (node) => ({
          value: node.value,
          complexity: 0,
        })),
      })),
    );
  }

  run(rng: Rng, size: number, config: GenConfig = {}): GenStream<TCurr> {
    const streamer = this.transformation(this.makeStreamer());
    return streamer(rng, size, config);
  }

  private transform<TNext>(transformation: GenStreamerTransformation<TCurr, TNext>): Gen<TNext> {
    return new GenImpl<TInit, TNext>(
      this.makeStreamer,
      (streamer) => transformation(this.transformation(streamer)),
      this.genFactory,
    );
  }
}
