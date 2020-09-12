import fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';

test('It runs with the default config', () => {
  const f = (): boolean => true;

  const p = dev.property(dev.integer.constant(0, 10), f);

  const result = dev.run(p);

  expect(result).toMatchObject({ kind: 'success' });
});

test('Given a true property, it returns success', () => {
  stable.assert(
    stable.property(fc.nat(), (seed) => {
      const f = (): boolean => true;

      const p = dev.property(dev.integer.constant(0, 10), f);

      const result = dev.run(p, { seed });

      expect(result).toMatchObject({ kind: 'success' });
    }),
  );
});

test('Given a false property, it returns failure', () => {
  stable.assert(
    stable.property(fc.nat(), (seed) => {
      const f = (): boolean => false;

      const p = dev.property(dev.integer.constant(0, 10), f);

      const result = dev.run(p, { seed });

      expect(result).toMatchObject({ kind: 'failure', reason: 'predicate' });
    }),
  );
});

test('Given any property, with an exhausted gen, it returns failure', () => {
  stable.assert(
    stable.property(fc.nat(), fc.boolean(), (seed, b) => {
      const f = (): boolean => b;

      const p = dev.property(dev.exhausted(), f);

      const result = dev.run(p, { seed });

      expect(result).toMatchObject({
        kind: 'exhaustion',
        iterationsCompleted: 0,
        iterationsRequested: 100,
      });
    }),
  );
});

test('Given any property, the result is repeatable when ran with the same seed', () => {
  stable.assert(
    stable.property(fc.nat(), fc.boolean(), (seed, b) => {
      const f = (): boolean => b;

      const p = dev.property(dev.integer.constant(0, 10), f);

      const result0 = dev.run(p, { seed });
      const result1 = dev.run(p, { seed });
      expect({ ...result0, seed: expect.anything() }).toEqual({ ...result1, seed: expect.anything() });
    }),
  );
});
