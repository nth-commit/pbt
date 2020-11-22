import { GenStream, GenStreamer, GenStreamerTransformation as GST, StatefulGenFunction } from './GenStream';
import { flatMap } from './GenStreamerTransformation.FlatMap';
import { filter } from './GenStreamerTransformation.Filter';
import { repeat } from './GenStreamerTransformation.Repeat';
import { transformInstances } from './GenStreamerTransformation.TransformInstances';
import { collect } from './GenStreamerTransformation.Collect';

export { GenStream, GenStreamer, StatefulGenFunction };

export type GenStreamerTransformation<T, U> = GST<T, U>;

const none = <T>(): GenStreamerTransformation<T, T> => (x) => x;

export const GenStreamerTransformation = { flatMap, filter, repeat, transformInstances, collect, none };
