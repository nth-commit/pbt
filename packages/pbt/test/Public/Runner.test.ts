import fc from 'fast-check';
import * as domainGen from './Helpers/domainGen';
import * as spies from '../helpers/spies';
import * as dev from '../../src/Public';
import * as devProperty from '../../src/Public/Property';
import * as devPropertyInternal from '../../src/Property';

type SpiedProperty = {
  p: devProperty.Property<[]>;
  exploreSpy: spies.InferMock<typeof devPropertyInternal.explore>;
  reproduceSpy: spies.InferMock<typeof devPropertyInternal.reproduce>;
  getPropertySpy: () => spies.InferMock<devPropertyInternal.Property<[]>> | null;
};

const makeSpiedProperty = (): SpiedProperty => {
  let propertySpy: spies.InferMock<devPropertyInternal.Property<[]>> | null = null;

  const spyAndCaptureProperty = <F extends (...args: any[]) => devPropertyInternal.Property<[]>>(
    f: F,
  ): spies.InferMock<F> => {
    return spies.spyOn((...args: any[]) => {
      const property = f(...args);
      propertySpy = spies.spyOn(property);
      return propertySpy;
    }) as any;
  };

  const exploreSpy = spyAndCaptureProperty(devPropertyInternal.explore);
  const reproduceSpy = spyAndCaptureProperty(devPropertyInternal.reproduce);

  return {
    p: new devProperty.Property<[]>([], () => true, undefined, exploreSpy as any, reproduceSpy as any),
    exploreSpy,
    reproduceSpy,
    getPropertySpy: () => propertySpy,
  };
};

type RunConfig = {
  seed: number;
  size: number;
  counterexamplePath: string | undefined;
};

type Runner = (property: devProperty.Property<[]>, config: Partial<RunConfig>) => void;

const runners: Runner[] = [dev.check];

test.each(runners)('When it runs without a counterexamplePath, it creates an exploration property', (runner) => {
  fc.assert(
    fc.property(domainGen.seed(), (seed) => {
      const { p, exploreSpy, reproduceSpy } = makeSpiedProperty();

      runner(p, { seed });

      expect(exploreSpy).toBeCalledTimes(1);
      expect(reproduceSpy).toBeCalledTimes(0);
    }),
  );
});

test.each(runners)('When it runs with a counterexamplePath, it creates an reproduction property', (runner) => {
  fc.assert(
    fc.property(domainGen.seed(), domainGen.counterexamplePath(), (seed, counterexamplePath) => {
      const { p, exploreSpy, reproduceSpy } = makeSpiedProperty();

      runner(p, { seed, counterexamplePath });

      expect(exploreSpy).toBeCalledTimes(0);
      expect(reproduceSpy).toBeCalledTimes(1);
    }),
  );
});

test.each(runners)('It marshalls the input seed correctly', (runner) => {
  fc.assert(
    fc.property(domainGen.seed(), domainGen.maybe(domainGen.counterexamplePath()), (seed, counterexamplePath) => {
      const { p, getPropertySpy } = makeSpiedProperty();

      runner(p, { seed, counterexamplePath });

      const propertySpy = getPropertySpy()!;
      const calls = spies.calls(propertySpy);
      expect(calls).toHaveLength(1);
      expect(calls[0][0].valueOf()).toEqual(seed);
    }),
  );
});

test.each(runners)('It passes the input size through, verbatim', (runner) => {
  fc.assert(
    fc.property(domainGen.size(), domainGen.maybe(domainGen.counterexamplePath()), (size, counterexamplePath) => {
      const { p, getPropertySpy } = makeSpiedProperty();

      runner(p, { size, counterexamplePath });

      const propertySpy = getPropertySpy()!;
      const calls = spies.calls(propertySpy);
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toEqual(size);
    }),
  );
});

test.each(runners)('It passes through the defaults', (runner) => {
  fc.assert(
    fc.property(domainGen.maybe(domainGen.counterexamplePath()), (counterexamplePath) => {
      const { p, getPropertySpy } = makeSpiedProperty();

      runner(p, { counterexamplePath });

      const propertySpy = getPropertySpy()!;
      const propertyCalls = spies.calls(propertySpy);
      expect(propertyCalls).toHaveLength(1);
      expect(propertyCalls[0][0]).toEqual(expect.anything());
      expect(propertyCalls[0][1]).toEqual(0);
    }),
  );
});
