# Decision Register

## Properties should not leverage native composition of generators

Generators will expose some composition, for example `zip`, to combine the elements of two generation streams into a tuple. However, at the property-level, it might be advantageous to not rely on such combinators, as it takes away the capability to resize/shrink generators independently.

For example, say we have a base generator which produces integers between 0 and 20. We might create two generators by filtering the original generator by `x > 10` and `x < 10`. Intuitively, one generator might have a much better chance of succeeding at lower sizes, and the other at higher sizes. Because we need both to succeed to test the property, the property needs the generators to run at different sizes in order for the property to have a reasonable chance of fulfilling its values. A property should be able to poke at the generators independently, and infer some heuristics about what sizes seem to generate stuff.

_Size is (most likely) closely related to a generators chance of successfully producing a value._