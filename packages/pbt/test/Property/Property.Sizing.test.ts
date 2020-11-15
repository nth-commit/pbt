import { count, first, last } from 'ix/iterable';
import { Gen } from 'pbt';
import * as dev from '../../src';
import { calculatePropertySizes } from '../../src/Property/calculatePropertySizes';
import { DomainGenV2 } from '../Helpers/domainGenV2';
import * as spies from '../Helpers/spies';

describe('unit tests', () => {
  test.each([
    [0, []],
    [1, [0]],
    [2, [0, 99]],
    [3, [0, 50, 99]],
    [4, [0, 33, 66, 99]],
  ])('iterations = %i, sizes = %p', (iterations, expectedSizes) => {
    const sizes = calculatePropertySizes(iterations);

    expect(sizes).toEqual(expectedSizes);
  });

  test.property(
    'iterations < 0 || iterations ∉ ℤ, *throws*',
    DomainGenV2.choose(
      Gen.integer().lessThanEqual(-1),
      Gen.integer().map((x) => x + 0.1), // Hacky way to consistently produce a decimal
    ),
    (iterations) => {
      expect(() => calculatePropertySizes(iterations)).toThrow('Fatal: Iterations must be positive integer');
    },
  );

  test.property('first(sizes) = 0', Gen.integer().between(1, 200), (iterations) => {
    const sizes = calculatePropertySizes(iterations);

    expect(first(sizes)).toEqual(0);
  });

  test.property('if iterations ∈ [2, 99], last(sizes) = 99', Gen.integer().between(2, 99), (iterations) => {
    const sizes = calculatePropertySizes(iterations);

    expect(last(sizes)).toEqual(99);
  });

  test.property('if iterations < 99, count(sizes) = iterations', Gen.integer().between(0, 99), (iterations) => {
    const sizes = calculatePropertySizes(iterations);

    expect(count(sizes)).toEqual(iterations);
  });

  test.property('if iterations >= 100, count(sizes) = 100', Gen.integer().between(100, 200), (iterations) => {
    const sizes = calculatePropertySizes(iterations);

    expect(count(sizes)).toEqual(iterations);
  });

  test.property('sizes ∈ [0 .. 99]', Gen.integer().between(0, 200), (iterations) => {
    const sizes = calculatePropertySizes(iterations);

    for (const size of sizes) {
      expect(size).toBeWithin(0, 100);
    }
  });

  describe('requestedSize', () => {
    test.property(
      'requestedSize < 0 || requestedSize > 99 || requestedSize ∉ ℤ, *throws*',
      Gen.integer().greaterThanEqual(0),
      DomainGenV2.choose(
        Gen.integer().lessThanEqual(-1),
        Gen.integer().greaterThanEqual(100),
        Gen.integer().map((x) => x + 0.1), // Hacky way to consistently produce a decimal
      ),
      (iterations, requestedSize) => {
        expect(() => calculatePropertySizes(iterations, requestedSize)).toThrow(
          'Fatal: Size must integer in [0 .. 99]',
        );
      },
    );

    test.property(
      'requestedSize is repeated for iterations',
      Gen.integer().between(0, 200),
      DomainGenV2.size(),
      (iterations, requestedSize) => {
        const sizes = Array.from(calculatePropertySizes(iterations, requestedSize));

        expect(sizes).toHaveLength(iterations);
        for (const size of sizes) {
          expect(size).toEqual(requestedSize);
        }
      },
    );
  });
});

describe('integration tests', () => {
  test.property(
    'properties behave with respect to calculatePropertySizes',
    Gen.integer().between(0, 200),
    DomainGenV2.choose(Gen.constant(undefined), DomainGenV2.size()),
    (iterations, requestedSize) => {
      const expectedSizes = Array.from(calculatePropertySizes(iterations, requestedSize));

      const f = spies.spyOn<(sz: dev.Size) => boolean>(() => true);
      const g = dev.Gen.create((_, size) => size, dev.Shrink.none());
      const p = dev.property(g, f);
      dev.check(p, { iterations, size: requestedSize });

      const calls = spies.calls(f);
      const actualSizes = calls.map(([s]) => s);
      expect(actualSizes).toEqual(expectedSizes);
    },
  );

  test.property(
    'if iterations > 1, and property fails when size >= 99, then it is falsified',
    Gen.integer().greaterThanEqual(2),
    (iterations) => {
      const genOfSize = dev.Gen.create((_, size) => size, dev.Shrink.none());
      const p = dev.property(genOfSize, (size) => size < 99);
      const c = dev.check(p, { iterations });

      expect(c.kind).toEqual('falsified');
    },
  );
});
