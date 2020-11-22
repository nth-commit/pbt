import { Gen } from 'pbt';
import * as dev from '../../src';
import { DomainGenV2 } from '../Helpers/domainGenV2';

const arrayRange = (length: number): number[] => [...Array(length).keys()];

test.each([[], {}, new Map(), new Set()])('Gen.element(c), c = %p *produces* error', (c) => {
  const gen = dev.Gen.element(c);

  expect(() => dev.sample(gen)).toThrow('Gen.element invoked with empty collection');
});

test.property(
  'Gen.element(Array) *produces* elements like *oracle* Gen.integer().between(0, size - 1).noBias()',
  DomainGenV2.seed(),
  DomainGenV2.size(),
  Gen.integer().between(1, 10),
  (seed, size, length) => {
    const a = arrayRange(length);
    const genElement = dev.Gen.element(a);
    const genInteger = dev.Gen.integer()
      .between(0, length - 1)
      .noBias();

    const sample0 = <T>(g: dev.Gen<T>) => dev.sample(g, { seed, size, iterations: 1 });
    expect(sample0(genElement)).toEqual(sample0(genInteger));
  },
);

test.property(
  'Gen.element(Object) *produces* elements like *oracle* Gen.integer().between(0, size - 1).noBias()',
  DomainGenV2.seed(),
  DomainGenV2.size(),
  Gen.integer().between(1, 10),
  (seed, size, length) => {
    const o = arrayRange(length).reduce((acc, i) => ({ ...acc, [i]: i }), {});
    const genElement = dev.Gen.element(o);
    const genInteger = dev.Gen.integer()
      .between(0, length - 1)
      .noBias();

    const sample0 = <T>(g: dev.Gen<T>) => dev.sample(g, { seed, size, iterations: 1 });
    expect(sample0(genElement)).toEqual(sample0(genInteger));
  },
);

test.property(
  'Gen.element(Set), *produces* elements like *oracle* Gen.integer().between(0, size - 1).noBias()',
  DomainGenV2.seed(),
  DomainGenV2.size(),
  Gen.integer().between(1, 10),
  (seed, size, length) => {
    const s = new Set(arrayRange(length));
    const genElement = dev.Gen.element(s);
    const genInteger = dev.Gen.integer()
      .between(0, length - 1)
      .noBias();

    const sample0 = <T>(g: dev.Gen<T>) => dev.sample(g, { seed, size, iterations: 1 });
    expect(sample0(genElement)).toEqual(sample0(genInteger));
  },
);

test.property(
  'Gen.element(Map), *produces* elements like *oracle* Gen.integer().between(0, size - 1).noBias()',
  DomainGenV2.seed(),
  DomainGenV2.size(),
  Gen.integer().between(1, 10),
  (seed, size, length) => {
    const m = new Map(arrayRange(length).map((x) => [x, x]));
    const genElement = dev.Gen.element(m);
    const genInteger = dev.Gen.integer()
      .between(0, length - 1)
      .noBias();

    const sample0 = <T>(g: dev.Gen<T>) => dev.sample(g, { seed, size, iterations: 1 });
    expect(sample0(genElement)).toEqual(sample0(genInteger));
  },
);
