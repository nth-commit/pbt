# Values

- It's primary purpose is to explore ideas around property-based testing
- It's secondary purpose is developer ergonomics
- Also;
    - It should work well with jest
    - It should port to other platforms
        - It should be spec-driven
    - It should be functional
    - It should be modular
        - It should be able to support hotswapping of different versions of components, to support rapid/risk-free prototyping
        - It should expose a small core of funtionality, which is extended by other packages in the repo to create a wide suite of functionality
    - It should (eventually) test itself