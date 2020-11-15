import { assert, property, Gen } from 'pbt';
import * as dev from '../../src';
import { DomainGenV2 } from '../Helpers/domainGenV2';
import * as spies from '../Helpers/spies';

describe('sample', () => {
  afterEach(() => dev.defaultConfig({}));

  it('respects default iterations', () => {
    assert(
      property(Gen.integer().between(1, 100), DomainGenV2.anything(), (iterations, value) => {
        const g = dev.Gen.constant(value);

        dev.defaultConfig({ iterations });

        const s = dev.sample(g);

        expect(s.values).toHaveLength(iterations);
      }),
    );
  });

  it('respects default seed', () => {
    assert(
      property(DomainGenV2.seed(), DomainGenV2.anything(), (seed, value) => {
        const g = dev.Gen.constant(value);

        dev.defaultConfig({ seed });

        const s = dev.sample(g);

        expect(s.seed).toEqual(seed);
      }),
    );
  });
});

describe('check', () => {
  afterEach(() => dev.defaultConfig({}));

  type RunFn = dev.Property<any[]>['run'];

  class MockProperty implements dev.Property<any[]> {
    constructor(private runFn: RunFn) {}

    run(seed: number, iterations: number): Iterable<dev.PropertyIteration<any[]>> {
      return this.runFn(seed, iterations);
    }
  }

  it('respects default iterations', () => {
    assert(
      property(Gen.integer().between(1, 100), (iterations) => {
        const p = dev.property(() => true);

        dev.defaultConfig({ iterations });

        const c = dev.check(p);

        expect(c.iterations).toEqual(iterations);
      }),
    );
  });

  it('respects default seed', () => {
    assert(
      property(DomainGenV2.seed(), (seed) => {
        const run = spies.spyOn<RunFn>(() => []);
        const p = new MockProperty(run);

        dev.defaultConfig({ seed });

        dev.check(p);

        const spiedSeed = spies.calls(run)[0][0];
        expect(spiedSeed).toEqual(seed);
      }),
    );
  });
});
