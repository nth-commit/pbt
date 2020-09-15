import fc from 'fast-check';
import * as dev from '../src';
import * as stable from './helpers/stableApi';

const tryAssert = (p: dev.Property<unknown[]>, config?: Partial<dev.RunConfig>): Error | null => {
  try {
    dev.assert(p, config);
  } catch (error) {
    return error;
  }
  return null;
};

test('An assertion does not throw for an infallible property', () => {
  stable.assert(
    stable.property(fc.nat().noShrink(), (seed) => {
      const g = dev.integer.constant(0, 10);
      const p = dev.property(g, (x) => x <= 10);

      const error = tryAssert(p, { seed });

      expect(error).toBeNull();
    }),
  );
});

test('An assertion throws for a fallible predicate property', () => {
  stable.assert(
    stable.property(fc.nat().noShrink(), (seed) => {
      const g = dev.integer.constant(0, 10);
      const p = dev.property(g, (x) => x < 5);

      const error = tryAssert(p, { seed });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(
        new RegExp(
          [
            '^Property failed after \\d+ test\\(s\\)',
            'Reproduction: \\{ \\"seed\\": \\d+, \\"size\\": \\d+(, \\"shrinkPath\\": \\".*\\")? \\}',
            'Counterexample: \\[5\\]$',
          ].join('\n'),
          'g',
        ),
      );
    }),
  );
});

test('An assertion throws for a fallible throwing property', () => {
  stable.assert(
    stable.property(fc.nat().noShrink(), (seed) => {
      const g = dev.integer.constant(0, 10);
      const p = dev.property(g, (x) => {
        expect(x).toBeLessThan(5);
      });

      const error = tryAssert(p, { seed: 0 });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(
        new RegExp(
          [
            '^Property failed after \\d+ test\\(s\\)',
            'Reproduction: \\{ \\"seed\\": \\d+, \\"size\\": \\d+(, \\"shrinkPath\\": \\".*\\")? \\}',
            'Counterexample: \\[5\\]',
          ].join('\n'),
          'g',
        ),
      );
    }),
  );
});

test('An assertion failure is reproducible', () => {
  stable.assert(
    stable.property(fc.nat().noShrink(), (seed) => {
      const g = dev.integer.constant(0, 10);
      const p = dev.property(g, (x) => x < 5);

      const config0: Partial<dev.RunConfig> = { seed };
      const error0 = tryAssert(p, config0);
      expect(error0).not.toBeNull();
      expect(error0!.message).not.toEqual('');

      const reproductionJson = error0!.message.match(/Reproduction: (\{.*\})/)![1];
      const config1: Partial<dev.RunConfig> = JSON.parse(reproductionJson);
      const error1 = tryAssert(p, config1);
      expect(error1).not.toBeNull();
      expect(error1!.message).not.toEqual('');

      const normalizeMessage = (str: string): string => str.split('\n').slice(1).join('\n');
      const errorMessage0 = normalizeMessage(error0!.message);
      const errorMessage1 = normalizeMessage(error1!.message);
      expect(errorMessage0).toEqual(errorMessage1);
    }),
  );
});
