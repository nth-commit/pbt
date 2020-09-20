export type Gens_FirstOrder =
  | 'integer.unscaled'
  | 'integer.scaleLinearly'
  | 'naturalNumber.unscaled'
  | 'naturalNumber.scaleLinearly';

export type Gens_SecondOrder = 'noShrink';

export type Gens = Gens_FirstOrder | Gens_SecondOrder;

export type Gens_Ranged_Constant = 'integer.unscaled' | 'naturalNumber.unscaled';

export type Gens_Ranged_Linear = 'integer.scaleLinearly' | 'naturalNumber.scaleLinearly';

export type Gens_Ranged = Gens_Ranged_Constant | Gens_Ranged_Linear;
