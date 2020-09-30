import { take } from 'ix/iterable/operators';
import * as dev from '../src';

const something: unknown = Symbol('somethin');

const gens: dev.Gen<unknown>[] = [
  dev.gen.create(() => something, dev.shrink.none()),
  dev.gen.constant(something),
  dev.gen.integer.unscaled(0, 10),
  dev.gen.integer.scaleLinearly(0, 10),
  dev.gen.naturalNumber.unscaled(10),
  dev.gen.naturalNumber.scaleLinearly(10),
  dev.gen.naturalNumber.unscaled(),
  dev.gen.naturalNumber.scaleLinearly(),
  dev.gen.element([something]),
  dev.gen.array.unscaled(0, 10, dev.gen.constant(something)),
  dev.gen.array.scaleLinearly(0, 10, dev.gen.constant(something)),
  dev.gen.constant(something).map(() => something),
  dev.gen.constant(something).flatMap(() => dev.gen.constant(something)),
  dev.gen.constant(something).filter(() => true),
  dev.gen.constant(something).reduce(1, (acc) => acc, something),
  dev.gen.constant(something).noShrink(),
  dev.gen.constant(something).postShrink(dev.shrink.none()),
];

test.each([gens])('The gen can run', (gen) => {
  for (const _ of take(10)(gen.run(0, 0))) {
  }
});
