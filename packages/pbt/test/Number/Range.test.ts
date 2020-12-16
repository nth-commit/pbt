import fc, { nat } from 'fast-check';
import { nativeCalculator, Range, Bounds, ScaleMode, Integer } from '../../src/Number';
import * as domainGen from '../Helpers/domainGen';

namespace LocalGen {
  export const scaleMode = (): fc.Arbitrary<ScaleMode> => {
    const scaleModeExhaustive: { [P in ScaleMode]: P } = {
      constant: 'constant',
      linear: 'linear',
    };
    return fc.constantFrom(...Object.values(scaleModeExhaustive));
  };
}

type RangeParams = {
  min: Integer<number>;
  max: Integer<number>;
  origin: Integer<number>;
};

type UnorderedRangeParams = {
  x: Integer<number>;
  y: Integer<number>;
  z: Integer<number>;
};

const genRangeParams = (): fc.Arbitrary<RangeParams> =>
  fc.tuple(domainGen.naturalNumber(), domainGen.naturalNumber(), domainGen.integer()).map(
    ([minDiff, maxDiff, origin]): RangeParams => ({
      min: nativeCalculator.loadIntegerUnchecked(origin - minDiff),
      max: nativeCalculator.loadIntegerUnchecked(origin + maxDiff),
      origin: nativeCalculator.loadIntegerUnchecked(origin),
    }),
  );

const genShuffledRangeParams = (): fc.Arbitrary<{ ordered: RangeParams; unordered: UnorderedRangeParams }> => {
  const unorderRangeParams = (ordered: RangeParams): fc.Arbitrary<UnorderedRangeParams> =>
    domainGen.shuffle([ordered.min, ordered.max, ordered.origin]).map(([x, y, z]) => ({
      x,
      y,
      z,
    }));

  return genRangeParams().chain((ordered) => unorderRangeParams(ordered).map((unordered) => ({ ordered, unordered })));
};

it('reflects [min, max, origin]', () => {
  fc.assert(
    fc.property(genRangeParams(), LocalGen.scaleMode(), ({ min, max, origin }, scaleMode) => {
      const range = Range.createFrom(nativeCalculator, min, max, origin, scaleMode);

      const expectedRange: Partial<Range<number>> = {
        bounds: [min, max],
        origin,
      };
      expect(range).toMatchObject(expectedRange);
    }),
  );
});

it('has resilience to parameter ordering', () => {
  fc.assert(
    fc.property(genShuffledRangeParams(), LocalGen.scaleMode(), ({ ordered, unordered }, scaleMode) => {
      const range1 = Range.createFrom(nativeCalculator, ordered.min, ordered.max, ordered.origin, scaleMode);
      const range2 = Range.createFrom(nativeCalculator, unordered.x, unordered.y, unordered.z, scaleMode);

      expect(range1.origin).toEqual(range2.origin);
      expect(range1.bounds).toEqual(range2.bounds);
    }),
  );
});

describe('getProportionalDistance', () => {
  it('returns 0 when n = origin', () => {
    fc.assert(
      fc.property(
        genRangeParams(),
        LocalGen.scaleMode().filter((s) => s === 'constant'),
        ({ min, max, origin }, scaleMode) => {
          const range = Range.createFrom(nativeCalculator, min, max, origin, scaleMode);

          const distance = range.getProportionalDistance(origin);

          expect(distance).toEqual(0);
        },
      ),
    );
  });

  it('returns 100 when n = min, and n < origin', () => {
    fc.assert(
      fc.property(
        genRangeParams().filter((x) => x.min < x.origin),
        LocalGen.scaleMode(),
        ({ min, max, origin }, scaleMode) => {
          const range = Range.createFrom(nativeCalculator, min, max, origin, scaleMode);

          const distance = range.getProportionalDistance(min);

          expect(distance).toEqual(100);
        },
      ),
    );
  });

  it('returns 100 when n = max, and n > origin', () => {
    fc.assert(
      fc.property(
        genRangeParams().filter((x) => x.max > x.origin),
        LocalGen.scaleMode(),
        ({ min, max, origin }, scaleMode) => {
          const range = Range.createFrom(nativeCalculator, min, max, origin, scaleMode);

          const distance = range.getProportionalDistance(max);

          expect(distance).toEqual(100);
        },
      ),
    );
  });

  it.each([
    { min: -10, max: 10, origin: 0, n: 5, expectedDistance: 50 },
    { min: -10, max: 10, origin: 0, n: -5, expectedDistance: 50 },
    { min: -5, max: 15, origin: 5, n: 10, expectedDistance: 50 },
    { min: -15, max: 5, origin: -5, n: -10, expectedDistance: 50 },
  ])('examples', ({ min, max, origin, n, expectedDistance }) => {
    fc.assert(
      fc.property(LocalGen.scaleMode(), (scaleMode) => {
        const range = Range.createFrom(
          nativeCalculator,
          nativeCalculator.loadIntegerUnchecked(min),
          nativeCalculator.loadIntegerUnchecked(max),
          nativeCalculator.loadIntegerUnchecked(origin),
          scaleMode,
        );

        const distance = range.getProportionalDistance(nativeCalculator.loadIntegerUnchecked(n));

        expect(distance).toEqual(expectedDistance);
      }),
    );
  });
});

describe('constant ranges', () => {
  describe('getSizedBounds', () => {
    it('returns [min,max] when 0 <= size <= 100 ', () => {
      fc.assert(
        fc.property(genRangeParams(), domainGen.size(), ({ min, max, origin }, size) => {
          const range = Range.createFrom(nativeCalculator, min, max, origin, 'constant');

          const bounds = range.getSizedBounds(nativeCalculator.loadIntegerUnchecked(size));

          const expectedBounds: Bounds<number> = [min, max];
          expect(bounds).toMatchObject(expectedBounds);
        }),
      );
    });
  });
});

describe('linear ranges', () => {
  describe('getSizedBounds', () => {
    it('returns [origin,origin] when given size = 0', () => {
      fc.assert(
        fc.property(genRangeParams(), ({ min, max, origin }) => {
          const range = Range.createFrom(nativeCalculator, min, max, origin, 'linear');

          const bounds = range.getSizedBounds(nativeCalculator.zero);

          const expectedBounds: Bounds<number> = [origin, origin];
          expect(bounds).toMatchObject(expectedBounds);
        }),
      );
    });

    it('returns [min,max] when given size = 100', () => {
      fc.assert(
        fc.property(genRangeParams(), ({ min, max, origin }) => {
          const range = Range.createFrom(nativeCalculator, min, max, origin, 'linear');

          const bounds = range.getSizedBounds(nativeCalculator.loadIntegerUnchecked(100));

          const expectedBounds: Bounds<number> = [min, max];
          expect(bounds).toMatchObject(expectedBounds);
        }),
      );
    });

    describe('examples', () => {
      it.each([
        { size: 10, expectedBounds: [-1, 1] },
        { size: 5, expectedBounds: [-1, 1] },
        { size: 50, expectedBounds: [-5, 5] },
      ])('a symmetrical range around 0', ({ size, expectedBounds }) => {
        const range = Range.createFrom(
          nativeCalculator,
          nativeCalculator.loadIntegerUnchecked(-10),
          nativeCalculator.loadIntegerUnchecked(0),
          nativeCalculator.loadIntegerUnchecked(10),
          'linear',
        );

        const bounds = range.getSizedBounds(nativeCalculator.loadIntegerUnchecked(size));

        expect(bounds).toEqual(expectedBounds);
      });

      it.each([
        { size: 10, expectedBounds: [-1, 2] },
        { size: 5, expectedBounds: [-1, 1] },
        { size: 50, expectedBounds: [-5, 10] },
      ])('a non-symmetrical range around 0', ({ size, expectedBounds }) => {
        const range = Range.createFrom(
          nativeCalculator,
          nativeCalculator.loadIntegerUnchecked(-10),
          nativeCalculator.loadIntegerUnchecked(0),
          nativeCalculator.loadIntegerUnchecked(20),
          'linear',
        );

        const bounds = range.getSizedBounds(nativeCalculator.loadIntegerUnchecked(size));

        expect(bounds).toEqual(expectedBounds);
      });

      it.each([
        { size: 10, expectedBounds: [0, 2] },
        { size: 5, expectedBounds: [0, 2] },
        { size: 50, expectedBounds: [-4, 6] },
      ])('a symmetrical range not around 0', ({ size, expectedBounds }) => {
        const range = Range.createFrom(
          nativeCalculator,
          nativeCalculator.loadIntegerUnchecked(-9),
          nativeCalculator.loadIntegerUnchecked(1),
          nativeCalculator.loadIntegerUnchecked(11),
          'linear',
        );

        const bounds = range.getSizedBounds(nativeCalculator.loadIntegerUnchecked(size));

        expect(bounds).toEqual(expectedBounds);
      });
    });
  });
});
