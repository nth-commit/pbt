import { Seed } from './Seed';
import { Size } from './Size';
import { GenInstance } from './GenInstance';

export type GenDiscard = {
  kind: 'discard';
};

export type GenExhaustion = {
  kind: 'exhaustion';
};

export type GenResult<T> = GenInstance<T> | GenDiscard | GenExhaustion;

export namespace GenResult {
  export const isInstance = <T>(r: GenResult<T>): r is GenInstance<T> => r.kind === 'instance';
}

export interface Gen<T> {
  (seed: Seed, size: Size): Iterable<GenResult<T>>;
}

export type Gens = Gen<any>[];
