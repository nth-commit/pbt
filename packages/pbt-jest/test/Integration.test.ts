import '../src';
import { Gen } from 'pbt';

test.property('a 0-arity property can run', () => {});

test.property('a 1-arity property can run', Gen.constant('a'), (a) => {
  expect(a).toEqual('a');
});

test.property('a 2-arity property can run', Gen.constant('a'), Gen.constant('b'), (a, b) => {
  expect(a).toEqual('a');
  expect(b).toEqual('b');
});

test
  .property('a property receives the seed and the size', Gen.integer(), (x) => {
    expect(x).toEqual(717354021); // Saaaaaaahhhh rand0m
  })
  .config({ seed: 1, size: 50, iterations: 1 });
