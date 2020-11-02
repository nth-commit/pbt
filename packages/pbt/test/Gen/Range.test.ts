import fc from 'fast-check';
import { Bounds, Range } from '../../src/Gen/Range';
import * as domainGen from '../Helpers/domainGen';

type RangeParams = {
  min: number;
  max: number;
  origin: number;
};

type UnorderedRangeParams = {
  x: number;
  y: number;
  z: number;
};

const genRangeParams = (): fc.Arbitrary<RangeParams> =>
  fc.tuple(domainGen.naturalNumber(), domainGen.naturalNumber(), domainGen.integer()).map(
    ([minDiff, maxDiff, origin]): RangeParams => ({
      min: origin - minDiff,
      max: origin + maxDiff,
      origin,
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
    fc.property(genRangeParams(), domainGen.scaleMode(), ({ min, max, origin }, scaleMode) => {
      const range = Range.createFrom(min, max, origin, scaleMode);

      const expectedRange: Partial<Range> = {
        bounds: [min, max],
        origin,
      };
      expect(range).toMatchObject(expectedRange);
    }),
  );
});

it('has resilience to parameter ordering', () => {
  fc.assert(
    fc.property(genShuffledRangeParams(), domainGen.scaleMode(), ({ ordered, unordered }, scaleMode) => {
      const range1 = Range.createFrom(ordered.min, ordered.max, ordered.origin, scaleMode);
      const range2 = Range.createFrom(unordered.x, unordered.y, unordered.z, scaleMode);

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
        domainGen.scaleMode().filter((s) => s === 'constant'),
        ({ min, max, origin }, scaleMode) => {
          const range = Range.createFrom(min, max, origin, scaleMode);

          const distance = range.getProportionalDistance(origin);

          const expectedDistance: typeof distance = 0;
          expect(distance).toEqual(expectedDistance);
        },
      ),
    );
  });

  it('returns 100 when n = min, and n < origin', () => {
    fc.assert(
      fc.property(
        genRangeParams().filter((x) => x.min < x.origin),
        domainGen.scaleMode(),
        ({ min, max, origin }, scaleMode) => {
          const range = Range.createFrom(min, max, origin, scaleMode);

          const distance = range.getProportionalDistance(min);

          const expectedDistance: typeof distance = 100;
          expect(distance).toEqual(expectedDistance);
        },
      ),
    );
  });

  it('returns 100 when n = max, and n > origin', () => {
    fc.assert(
      fc.property(
        genRangeParams().filter((x) => x.max > x.origin),
        domainGen.scaleMode(),
        ({ min, max, origin }, scaleMode) => {
          const range = Range.createFrom(min, max, origin, scaleMode);

          const distance = range.getProportionalDistance(max);

          const expectedDistance: typeof distance = 100;
          expect(distance).toEqual(expectedDistance);
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
      fc.property(domainGen.scaleMode(), (scaleMode) => {
        const range = Range.createFrom(min, max, origin, scaleMode);

        const distance = range.getProportionalDistance(n);

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
          const range = Range.createFrom(min, max, origin, 'constant');

          const bounds = range.getSizedBounds(size);

          const expectedBounds: Bounds = [min, max];
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
          const range = Range.createFrom(min, max, origin, 'linear');

          const bounds = range.getSizedBounds(0);

          const expectedBounds: Bounds = [origin, origin];
          expect(bounds).toMatchObject(expectedBounds);
        }),
      );
    });

    it('returns [min,max] when given size = 100', () => {
      fc.assert(
        fc.property(genRangeParams(), ({ min, max, origin }) => {
          const range = Range.createFrom(min, max, origin, 'linear');

          const bounds = range.getSizedBounds(100);

          const expectedBounds: Bounds = [min, max];
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
        const range = Range.createFrom(-10, 0, 10, 'linear');

        const bounds = range.getSizedBounds(size);

        expect(bounds).toEqual(expectedBounds);
      });

      it.each([
        { size: 10, expectedBounds: [-1, 2] },
        { size: 5, expectedBounds: [-1, 1] },
        { size: 50, expectedBounds: [-5, 10] },
      ])('a non-symmetrical range around 0', ({ size, expectedBounds }) => {
        const range = Range.createFrom(-10, 0, 20, 'linear');

        const bounds = range.getSizedBounds(size);

        expect(bounds).toEqual(expectedBounds);
      });

      it.each([
        { size: 10, expectedBounds: [0, 2] },
        { size: 5, expectedBounds: [0, 2] },
        { size: 50, expectedBounds: [-4, 6] },
      ])('a symmetrical range not around 0', ({ size, expectedBounds }) => {
        const range = Range.createFrom(-9, 1, 11, 'linear');

        const bounds = range.getSizedBounds(size);

        expect(bounds).toEqual(expectedBounds);
      });
    });
  });
});
