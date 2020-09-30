import fc from 'fast-check';
import * as domainGen from './Helpers/domainGen';
import * as spies from '../helpers/spies';
import * as dev from '../../src/Public';
import * as devProperty from '../../src/Property';

type SpiedProperty = {
  p: dev.Property<[]>;
  exploreSpy: spies.InferMock<typeof devProperty.explore>;
  reproduceSpy: spies.InferMock<typeof devProperty.reproduce>;
  getPropertySpy: () => spies.InferMock<devProperty.Property<[]>> | null;
};

const makeSpiedProperty = (): SpiedProperty => {
  let propertySpy: spies.InferMock<devProperty.Property<[]>> | null = null;

  const spyAndCaptureProperty = <F extends (...args: any[]) => devProperty.Property<[]>>(f: F): spies.InferMock<F> => {
    return spies.spyOn((...args: any[]) => {
      const property = f(...args);
      propertySpy = spies.spyOn(property);
      return propertySpy;
    }) as any;
  };

  const exploreSpy = spyAndCaptureProperty(devProperty.explore);
  const reproduceSpy = spyAndCaptureProperty(devProperty.reproduce);

  return {
    p: new dev.Property<[]>([], () => true, undefined, exploreSpy as any, reproduceSpy as any),
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

type Runner = (property: dev.Property<[]>, config: Partial<RunConfig>) => void;

type RunnerName = 'check' | 'assert';

const runnersByName: { [Name in RunnerName]: Runner } = {
  check: dev.check,
  assert: (property, config) => {
    try {
      dev.assert(property, config);
    } catch {
      // Assert might throw, but we test this behaviour elsewhere
    }
  },
};

const runnerNames = Object.keys(runnersByName) as RunnerName[];

test.each(runnerNames)(
  'When it runs without a counterexamplePath, it creates an exploration property (%s)',
  (runnerName) => {
    const runner = runnersByName[runnerName];

    fc.assert(
      fc.property(domainGen.seed(), (seed) => {
        const { p, exploreSpy, reproduceSpy } = makeSpiedProperty();

        runner(p, { seed });

        expect(exploreSpy).toBeCalledTimes(1);
        expect(reproduceSpy).toBeCalledTimes(0);
      }),
    );
  },
);

test.each(runnerNames)(
  'When it runs with a counterexamplePath, it creates an reproduction property (%s)',
  (runnerName) => {
    const runner = runnersByName[runnerName];

    fc.assert(
      fc.property(domainGen.seed(), domainGen.counterexamplePath(), (seed, counterexamplePath) => {
        const { p, exploreSpy, reproduceSpy } = makeSpiedProperty();

        runner(p, { seed, counterexamplePath });

        expect(exploreSpy).toBeCalledTimes(0);
        expect(reproduceSpy).toBeCalledTimes(1);
      }),
    );
  },
);

test.each(runnerNames)('It marshalls the input seed correctly (%s)', (runnerName) => {
  const runner = runnersByName[runnerName];

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

test.each(runnerNames)('It passes the input size through, verbatim (%s)', (runnerName) => {
  const runner = runnersByName[runnerName];

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

test.each(runnerNames)('It passes through the defaults (%s)', (runnerName) => {
  const runner = runnersByName[runnerName];

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
