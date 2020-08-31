import { Seed } from './Seed';
import { Size } from './Size';

export type GenInstance<T> = {
  kind: 'instance';
  readonly value: T;
  shrink(): Iterable<GenInstance<T>>;
};

export type GenExhaustion = {
  kind: 'exhaustion';
};

export type GenResult<T> = GenInstance<T> | GenExhaustion;

export namespace GenResult {
  export const isInstance = <T>(r: GenResult<T>): r is GenInstance<T> => r.kind === 'instance';
}

export interface Gen<T> {
  (seed: Seed, size: Size): Iterable<GenResult<T>>;
}

export type Gens = [Gen<any>, ...Gen<any>[]];
