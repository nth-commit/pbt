# Decision Register

## Properties should not leverage native composition of generators

Generators will expose some composition, for example `zip`, to combine the elements of two generation streams into a tuple. However, at the property-level, it might be advantageous to not rely on such combinators, as it takes away the capability to resize/shrink generators independently.

For example, say we have a base generator which produces integers between 0 and 20. We might create two generators by filtering the original generator by `x > 10` and `x < 10`. Intuitively, one generator might have a much better chance of succeeding at lower sizes, and the other at higher sizes. Because we need both to succeed to test the property, the property needs the generators to run at different sizes in order for the property to have a reasonable chance of fulfilling its values. A property should be able to poke at the generators independently, and infer some heuristics about what sizes seem to generate stuff.

_Size is (most likely) closely related to a generators chance of successfully producing a value._

## Generators should never throw, under any circumstances

Instead, they should produce an error token, so that the feedback can bubble up to the consumers in the same way as if a generator was exhausted.

An example of a case where we might consider crashing, is if the given origin of a range is outside it's bounds. However, we cannot infer all the ways in which consumers might construct generators. For example, a consumer might be generating random ranges and binding those to a random integer. It is feasible that, due to an error in their generator, the origin of their range is outside the range's bounds. For the consumer's perspective, this error is equatable to say trying to filter with an impossible predicate, so they should receive feedback in the same way. This means we need to place an error signal into the stream.