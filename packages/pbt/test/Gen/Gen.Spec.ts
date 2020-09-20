export type Gens_FirstOrder = 'integer.unscaled' | 'integer.scaleLinearly';

export type Gens_SecondOrder = never;

export type Gens = Gens_FirstOrder | Gens_SecondOrder;

export type Gens_ThatHaveAUniformDistribution = 'integer.unscaled' | 'integer.scaleLinearly';

export type Gens_ThatAreRangeDependent = 'integer.unscaled' | 'integer.scaleLinearly';
