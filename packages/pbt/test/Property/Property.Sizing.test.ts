import { count, first, last, pipe, repeatValue } from 'ix/iterable';
import { flatMap, take } from 'ix/iterable/operators';
import { Gen } from 'pbt';
import * as dev from '../../src';
import { DomainGenV2 } from '../Helpers/domainGenV2';

const arrayRange = (n: number): number[] => [...Array(n).keys()];

const calculatePropertySizes = (iterations: number, requestedSize?: dev.Size): Iterable<dev.Size> => {
  if (iterations < 0 || !Number.isInteger(iterations)) throw new Error('Fatal: Iterations must be positive integer');

  if (requestedSize !== undefined) {
    if (requestedSize < 0 || requestedSize > 99 || !Number.isInteger(requestedSize))
      throw new Error('Fatal: Size must integer in [0 .. 99]');

    return pipe(repeatValue(requestedSize), take(iterations));
  }

  if (iterations === 0) return [];
  if (iterations === 1) return [0];
  if (iterations <= 99) {
    const sizeIncrement = Math.round(100 / (iterations - 1));
    return [0, ...arrayRange(iterations - 2).map((n) => sizeIncrement * (n + 1)), 99];
  }

  return pipe(
    repeatValue(null),
    flatMap(() => arrayRange(100)),
    take(iterations),
  );
};

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

  test.property('first(sizes) = 0', Gen.integer().between(1, 1000), (iterations) => {
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

  test.property('if iterations >= 100, count(sizes) = 100', Gen.integer().between(100, 1000), (iterations) => {
    const sizes = calculatePropertySizes(iterations);

    expect(count(sizes)).toEqual(iterations);
  });

  test.property('sizes ∈ [0 .. 99]', () => {});

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
      Gen.integer().between(0, 1000),
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
