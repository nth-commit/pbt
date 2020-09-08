import { Gen, Gens } from 'pbt-core';

export type GenValue<T> = T extends Gen<infer U> ? U : never;

export type GenValues<TGens extends Gens> = { [P in keyof TGens]: GenValue<TGens[P]> };
