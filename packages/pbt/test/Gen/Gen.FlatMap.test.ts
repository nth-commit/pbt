import * as dev from '../../src';

test('gen.flatMap(k), where right gen is based on left', () => {
  const genLeft = dev.Gen.integer().greaterThanEqual(0);
  const genFlatMapped = genLeft.flatMap((x) =>
    dev.Gen.integer()
      .greaterThanEqual(x + 1)
      .map((y) => [x, y]),
  );

  const min = dev.minimal(genFlatMapped);

  expect(min).toEqual([0, 1]);
});

test('gen.flatMap(k), where right gen is non-trivially based on left', () => {
  const genLeft = dev.Gen.integer().between(1, 100);
  const genFlatMapped = genLeft.flatMap((x) => dev.Gen.integer().between(0, 100).array().ofLength(x));

  const min = dev.minimal(genFlatMapped, (xs) => xs.some((x) => x >= 90));

  expect(min).toEqual([90]);
});

test('gen.flatMap(k), where left gen has impossible filter *produces* exhaustion', () => {
  const genLeft = dev.Gen.integer().filter(() => false);
  const genFlatMapped = genLeft.flatMap(() => dev.Gen.integer());

  expect(() => dev.sample(genFlatMapped)).toThrow('Exhausted');
});

test('gen.flatMap(k), where right gen has impossible filter *produces* exhaustion', () => {
  const genLeft = dev.Gen.integer();
  const genFlatMapped = genLeft.flatMap(() => dev.Gen.integer().filter(() => false));

  expect(() => dev.sample(genFlatMapped)).toThrow('Exhausted');
});
