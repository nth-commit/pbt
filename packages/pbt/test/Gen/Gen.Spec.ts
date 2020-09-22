export type Gens_FirstOrder =
  | 'integer.unscaled'
  | 'integer.scaleLinearly'
  | 'naturalNumber.unscaled'
  | 'naturalNumber.scaleLinearly';

export type Gens_SecondOrder =
  | 'operators.map'
  | 'operators.flatMap'
  | 'operators.filter'
  | 'operators.reduce'
  | 'operators.postShrink'
  | 'operators.noShrink'
  | 'array.unscaled'
  | 'array.scaleLinearly';

export type Gens = Gens_FirstOrder | Gens_SecondOrder;

export type Gens_Ranged_Constant = 'integer.unscaled' | 'naturalNumber.unscaled' | 'array.unscaled';

export type Gens_Ranged_Linear = 'integer.scaleLinearly' | 'naturalNumber.scaleLinearly' | 'array.scaleLinearly';

export type Gens_Ranged = Gens_Ranged_Constant | Gens_Ranged_Linear;
