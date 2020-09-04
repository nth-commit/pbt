# Differentiating Features

- Integrated shrinking
- Generating values dependent on previous value
    - It should be able to generate values based on a set of previous values. Whether this is implemented at the generator level or the property level TBC i.e. the generator code could expose an API each value takes the last, or the generator could generate arrays and there is an option to feed an array into a property, as if it was a single value.
- Filter exhuastion detection
    - When the generator gets into a state where it probably can't ever fulfil a value, it should exit (and not hang infinitely). 
- Error categorisation, automatic or manual
    - When a property fails it should do it's best to detemine if a smaller counterexample is a true counterexample (or if it's failing for some other bug in the production or test code).
- Gen.element<T>(collection: Array<T> | Set<T> | Map<unknown, T> | Record<unknown | T>): Gen<T>
