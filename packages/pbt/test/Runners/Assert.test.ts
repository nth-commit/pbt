import fc from 'fast-check';
import * as dev from '../../src';

const tryAssert = <Ts extends any[]>(p: dev.Property<Ts>, config?: Partial<dev.AssertConfig>): Error | null => {
  try {
    dev.assert(p, config);
  } catch (error) {
    return error;
  }
  return null;
};

test('An assertion does not throw for an infallible property', () => {
  fc.assert(
    fc.property(fc.nat().noShrink(), (seed) => {
      const g = dev.Gen.integer();
      const p = dev.property(g, () => true);

      const error = tryAssert(p, { seed });

      expect(error).toBeNull();
    }),
  );
});

test('An assertion throws for a fallible predicate property', () => {
  fc.assert(
    fc.property(fc.nat().noShrink(), (seed) => {
      const g = dev.Gen.integer();
      const p = dev.property(g, (x) => x < 5);

      const error = tryAssert(p, { seed });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(
        new RegExp(
          [
            '^Property failed after \\d+ test\\(s\\)',
            'Reproduction: \\{ \\"seed\\": \\d+, \\"size\\": \\d+(, \\"path\\": \\".*\\")? \\}',
            'Counterexample: \\[5\\]$',
          ].join('\n'),
          'g',
        ),
      );
    }),
  );
});

test('An assertion throws for a fallible throwing property', () => {
  fc.assert(
    fc.property(fc.nat().noShrink(), (seed) => {
      const g = dev.Gen.integer();
      const p = dev.property(g, (x) => {
        expect(x).toBeLessThan(5);
      });

      const error = tryAssert(p, { seed });

      expect(error).not.toBeNull();
      expect(error!.message).toMatch(
        new RegExp(
          [
            '^Property failed after \\d+ test\\(s\\)',
            'Reproduction: \\{ \\"seed\\": \\d+, \\"size\\": \\d+(, \\"path\\": \\".*\\")? \\}',
            'Counterexample: \\[5\\]',
          ].join('\n'),
          'g',
        ),
      );
    }),
  );
});

test('An assertion failure is reproducible', () => {
  fc.assert(
    fc.property(fc.nat().noShrink(), (seed) => {
      const g = dev.Gen.integer();
      const p = dev.property(g, (x) => x < 5);

      const config0: Partial<dev.AssertConfig> = { seed };
      const error0 = tryAssert(p, config0);
      expect(error0).not.toBeNull();
      expect(error0!.message).not.toEqual('');

      const reproductionJson = error0!.message.match(/Reproduction: (\{.*\})/)![1];
      const config1: Partial<dev.AssertConfig> = JSON.parse(reproductionJson);
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
