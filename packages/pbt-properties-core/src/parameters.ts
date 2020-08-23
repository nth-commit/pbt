import { Gen } from 'pbt-generator-core';

export type ForAllGen<T> = { kind: 'forAll'; gen: Gen<Array<T>> };

export type PropertyParameter<T> = Gen<T> | ForAllGen<T>;

export const forAll = <T>(g: Gen<Array<T>>): PropertyParameter<T> => ({ kind: 'forAll', gen: g });
