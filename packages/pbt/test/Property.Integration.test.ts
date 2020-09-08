import fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';
import { arbitrarySeed } from './helpers/arbitraries';

test('It runs with the default config', () => {
  const f = (): boolean => true;

  const p = dev.property(dev.integer.constant(0, 10), f);

  const result = dev.run(p);

  expect(result).toEqual({ kind: 'success' });
});

test('Given a true property, it returns success', () => {
  stable.assert(
    stable.property(arbitrarySeed(), (seed) => {
      const f = (): boolean => true;

      const p = dev.property(dev.integer.constant(0, 10), f);

      const result = dev.run(p, { seed });

      expect(result).toEqual({ kind: 'success' });
    }),
  );
});

test('Given a false property, it returns failure', () => {
  stable.assert(
    stable.property(arbitrarySeed(), (seed) => {
      const f = (): boolean => false;

      const p = dev.property(dev.integer.constant(0, 10), f);

      const result = dev.run(p, { seed });

      expect(result).toMatchObject({ kind: 'failure', problem: { kind: 'predicate' } });
    }),
  );
});

test('Given any property, with an exhausted gen, it returns failure', () => {
  stable.assert(
    stable.property(arbitrarySeed(), fc.boolean(), (seed, b) => {
      const f = (): boolean => b;

      const p = dev.property(dev.exhausted(), f);

      const result = dev.run(p, { seed });

      expect(result).toEqual({
        kind: 'failure',
        problem: { kind: 'exhaustion', iterationsCompleted: 0, iterationsRequested: 100 },
      });
    }),
  );
});
